<?php

namespace App\Jobs;

use App\Models\DataboyCompensation;
use App\Models\DataboyCompensationPayment;
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
 * Pays one approved databoy compensation.
 *
 * Double-payment defence: databoy_compensation_payments.paid_key holds the
 * compensation row id under a UNIQUE index. Winning that insert is what grants
 * the right to transfer, so a duplicate dispatch loses it and walks away
 * without calling Paystack. The claim is released only where we know for
 * certain no money moved.
 */
class PayDataboyCompensationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 90;

    public function __construct(public int $compensationId)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $log = fn (string $msg, array $ctx = []) => Log::info("[PayDataboyCompensationJob #{$this->compensationId}] {$msg}", $ctx);

        $compensation = DataboyCompensation::with('databoy.accreditationRecipient')->find($this->compensationId);

        if (!$compensation) {
            Log::warning("[PayDataboyCompensationJob #{$this->compensationId}] Aborted: row not found.");
            return;
        }

        if ($compensation->status !== 'approved') {
            $log('Aborted: not approved.');
            return;
        }

        $amount = (float) $compensation->amount;

        if ($amount <= 0) {
            $log('Aborted: no amount set.');
            return;
        }

        $recipient = $compensation->databoy?->accreditationRecipient;

        if (!$recipient || $recipient->status !== 'success' || !$recipient->recipient_code) {
            $log('Aborted: the matched databoy has no transfer recipient.');
            return;
        }

        // paid_key stops one compensation ROW being paid twice. It cannot stop
        // one BANK ACCOUNT being paid twice: two databoy records can carry the
        // same account number, each with its own recipient, and both would
        // settle into the same pocket.
        if ($twin = $this->accountAlreadyPaid($recipient->account_number, $compensation->id)) {
            $log('Aborted: this account number has already been paid a compensation.', [
                'account_number' => $recipient->account_number,
                'paid_row'       => $twin->databoy_compensation_id,
            ]);

            // Recorded, not silent — an admin has to see the near miss.
            DataboyCompensationPayment::create([
                'databoy_compensation_id' => $compensation->id,
                'databoy_id'              => $compensation->databoy_id,
                'paid_key'                => null,
                'amount'                  => $amount,
                'bank_name'               => $recipient->bank_name,
                'bank_code'               => $recipient->bank_code,
                'account_number'          => $recipient->account_number,
                'account_name'            => $recipient->account_name,
                'recipient_code'          => $recipient->recipient_code,
                'reference'               => 'comp-dup-' . $compensation->id . '-' . now()->timestamp . '-' . Str::random(6),
                'status'                  => 'failed',
                'message'                 => "Not paid — account {$recipient->account_number} was already compensated on row #{$twin->databoy_compensation_id}. If these are different people, correct the bank details and retry.",
            ]);

            return;
        }

        $payment = $this->claim($compensation, $recipient, $amount);

        if (!$payment) {
            $log('Aborted: another payment already holds this claim. No duplicate transfer sent.');
            return;
        }

        // Pace calls so a long run doesn't fire back-to-back at Paystack.
        usleep(1000000);

        $log('Sending transfer.', ['amount' => $amount, 'recipient' => $recipient->recipient_code]);

        $result = $paystack->initiateTransfer(
            $recipient->recipient_code,
            (int) round($amount * 100),
            $payment->reference,
            'Databoy compensation'
        );

        if (!($result['status'] ?? false)) {
            // Rejected outright, so nothing moved — safe to free the claim.
            $payment->update([
                'status'   => 'failed',
                'paid_key' => null,
                'message'  => $result['message'] ?? 'Transfer failed.',
            ]);
            $log('Transfer rejected — claim released.', ['message' => $result['message'] ?? null]);
            return;
        }

        $data = $result['data'] ?? [];

        $payment->update([
            'transfer_code' => $data['transfer_code'] ?? null,
            'reference'     => $data['reference'] ?? $payment->reference,
            'status'        => $this->normalizeStatus($data['status'] ?? null),
            'message'       => $data['reason'] ?? null,
        ]);

        $log('Finished.', ['status' => $payment->status]);
    }

    /**
     * A live compensation payment already sent to this bank account, from a
     * different compensation row — or null if the account is untouched.
     */
    private function accountAlreadyPaid(?string $accountNumber, int $exceptCompensationId): ?DataboyCompensationPayment
    {
        if (blank($accountNumber)) {
            return null;
        }

        return DataboyCompensationPayment::whereNotNull('paid_key')
            ->where('account_number', $accountNumber)
            ->where('databoy_compensation_id', '!=', $exceptCompensationId)
            ->first();
    }

    private function claim(DataboyCompensation $compensation, $recipient, float $amount): ?DataboyCompensationPayment
    {
        try {
            return DataboyCompensationPayment::create([
                'databoy_compensation_id' => $compensation->id,
                'databoy_id'              => $compensation->databoy_id,
                'paid_key'                => $compensation->id,
                'amount'                  => $amount,
                'bank_name'               => $recipient->bank_name,
                'bank_code'               => $recipient->bank_code,
                'account_number'          => $recipient->account_number,
                'account_name'            => $recipient->account_name,
                'recipient_code'          => $recipient->recipient_code,
                'reference'               => 'comp-' . $compensation->id . '-' . now()->timestamp . '-' . Str::random(6),
                'status'                  => 'pending',
            ]);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000') {
                return null;
            }

            throw $e;
        }
    }

    /**
     * Anything not clearly success/failed is 'unknown' and must never be
     * auto-retried — retrying a transfer that went through is how someone gets
     * paid twice.
     */
    private function normalizeStatus(?string $status): string
    {
        return match (strtolower((string) $status)) {
            'success' => 'success',
            'failed', 'abandoned', 'reversed' => 'failed',
            'pending', 'otp', 'processing', 'queued' => 'pending',
            default   => 'unknown',
        };
    }
}
