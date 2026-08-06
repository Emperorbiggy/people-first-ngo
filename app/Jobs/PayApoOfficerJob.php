<?php

namespace App\Jobs;

use App\Models\ApoOfficer;
use App\Models\ApoPayment;
use App\Models\Setting;
use App\Services\PaystackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Pays one APO officer the flat APO amount, once.
 *
 * Every other payment job in this codebase guards against paying twice by
 * SELECTing for an existing payment first. That check is only as good as the
 * gap between it and the transfer: two jobs for the same officer (a duplicate
 * dispatch, a retry racing an auto-payment, a worker restart replaying a job)
 * can both read "not paid" and both transfer. That is how people got paid
 * twice before.
 *
 * This job cannot do that. Before any money moves it INSERTs a claim row whose
 * paid_key column carries a UNIQUE index. Winning that insert is what grants
 * the right to pay; losing it (duplicate key) means someone else already owns
 * this officer's payment and this job stops. The guarantee is enforced by the
 * database, not by timing.
 *
 * The claim is released (paid_key set to NULL, so a retry may claim it again)
 * ONLY when Paystack definitively tells us no transfer was made. If the
 * outcome is unknown — a timeout, a dropped connection, an exception — the
 * claim is deliberately KEPT and the payment is marked 'unknown' for an admin
 * to resolve by hand. An unknown transfer that actually went through must
 * never be silently retried; that is the exact path to a double payment.
 */
class PayApoOfficerJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 90;

    public function __construct(public int $apoOfficerId)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $log = fn (string $msg, array $ctx = []) => Log::info("[PayApoOfficerJob #{$this->apoOfficerId}] {$msg}", $ctx);

        $officer = ApoOfficer::with('application.recipient')->find($this->apoOfficerId);

        if (!$officer) {
            Log::warning("[PayApoOfficerJob #{$this->apoOfficerId}] Aborted: APO officer not found.");
            return;
        }

        if (!$officer->is_accredited) {
            $log('Aborted: officer is not APO-accredited.');
            return;
        }

        $application = $officer->application;

        if (!$application) {
            $log('Aborted: officer has no underlying application.');
            return;
        }

        $amount = (float) Setting::get('apo_payment_amount', 0);

        // Claim first, ask questions later — nothing below can run twice.
        $payment = $this->claim($officer, $application, $amount);

        if (!$payment) {
            $log('Aborted: another payment already holds this officer\'s claim. No duplicate payment sent.');
            return;
        }

        $log('Claim acquired.', ['payment_id' => $payment->id, 'amount' => $amount]);

        if ($amount <= 0) {
            $this->release($payment, 'APO amount not configured — set the APO officer amount in Settings.');
            $log('Released: APO amount not configured.');
            return;
        }

        if (!$application->recipient || $application->recipient->status !== 'success') {
            $log('No successful recipient on file — creating one now.');
            CreateApplicantRecipientJob::dispatchSync($application->id);
            $application->refresh()->load('recipient');
        }

        if (!$application->recipient || $application->recipient->status !== 'success') {
            $this->release($payment, $application->recipient->message ?? 'Failed to create transfer recipient.');
            $log('Released: no successful recipient available.');
            return;
        }

        $payment->update(['recipient_code' => $application->recipient->recipient_code]);

        // Pace transfers so a burst of checkouts doesn't fire back-to-back.
        usleep(1000000);

        try {
            $result = $paystack->initiateTransfer(
                $application->recipient->recipient_code,
                (int) round($amount * 100),
                $payment->reference,
                'APO officer payment'
            );
        } catch (\Throwable $e) {
            // Unknown outcome: the request may well have reached Paystack.
            // Keep the claim so nothing retries automatically.
            $payment->update(['status' => 'unknown', 'message' => 'Transfer outcome unknown: ' . $e->getMessage()]);
            Log::error("[PayApoOfficerJob #{$this->apoOfficerId}] Transfer threw — claim KEPT, marked unknown.", ['error' => $e->getMessage()]);
            return;
        }

        $log('Paystack responded.', $result);

        if (!($result['status'] ?? false)) {
            // A definite "no transfer happened" — safe to free for retry.
            $this->release($payment, $result['message'] ?? 'Transfer failed.');
            return;
        }

        $data = $result['data'] ?? [];

        $payment->update([
            'transfer_code' => $data['transfer_code'] ?? null,
            'reference'     => $data['reference'] ?? $payment->reference,
            'status'        => $this->normalizeStatus($data['status'] ?? null),
            'message'       => $data['reason'] ?? null,
        ]);

        $log('Finished — payment recorded.', ['status' => $payment->status]);
    }

    /**
     * Insert the exclusive claim. A duplicate-key error means another payment
     * already owns this officer — the only correct response is to walk away.
     */
    private function claim(ApoOfficer $officer, $application, float $amount): ?ApoPayment
    {
        try {
            return ApoPayment::create([
                'apo_officer_id'         => $officer->id,
                'databoy_application_id' => $application->id,
                'paid_key'               => $officer->id,
                'amount'                 => $amount,
                'bank_name'              => $application->bank_name,
                'bank_code'              => $application->bank_code,
                'account_number'         => $application->account_number,
                'account_name'           => $application->bank_account_name,
                'reference'              => 'apo-' . $officer->id . '-' . now()->timestamp . '-' . Str::random(6),
                'status'                 => 'pending',
            ]);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000') {
                return null;
            }

            throw $e;
        }
    }

    /**
     * Free the claim so the officer can be retried later. Only ever called
     * when we know for certain that no money moved.
     */
    private function release(ApoPayment $payment, string $message): void
    {
        $payment->update(['status' => 'failed', 'paid_key' => null, 'message' => $message]);
    }

    /**
     * Paystack reports queued transfers as "pending" at initiation; with OTP
     * disabled there is no confirmation step left, so that counts as paid.
     */
    private function normalizeStatus(?string $status): string
    {
        return ($status === null || $status === 'pending') ? 'success' : $status;
    }
}
