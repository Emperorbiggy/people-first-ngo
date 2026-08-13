<?php

namespace App\Jobs;

use App\Models\PoOfficer;
use App\Models\PoPayment;
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
 * Pays one APO/PO officer.
 *
 * Double-payment defence: po_payments.paid_key holds the po_officer_id under a
 * UNIQUE index. Winning that insert is what grants the right to transfer — a
 * duplicate dispatch of the same officer loses the insert and walks away
 * without calling Paystack. The claim is released (paid_key set to NULL) only
 * where we know for certain no money moved, so a genuine retry is possible
 * without ever risking a second transfer.
 */
class PayPoOfficerJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 90;

    public function __construct(public int $poOfficerId, public float $amount)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $log = fn (string $msg, array $ctx = []) => Log::info("[PayPoOfficerJob #{$this->poOfficerId}] {$msg}", $ctx);

        $officer = PoOfficer::find($this->poOfficerId);

        if (!$officer) {
            Log::warning("[PayPoOfficerJob #{$this->poOfficerId}] Aborted: officer not found.");
            return;
        }

        if ($this->amount <= 0) {
            $log('Aborted: amount not configured.');
            return;
        }

        if ($officer->recipient_status !== 'success' || !$officer->recipient_code) {
            $log('Aborted: no transfer recipient on file.');
            return;
        }

        // paid_key stops one ROSTER ROW being paid twice. It cannot stop the
        // same PERSON being paid twice under two rows — the roster keys on
        // account number, so the same name with two different accounts is two
        // rows, and checking both in would pay them both.
        if ($twin = $this->alreadyPaidUnderAnotherRow($officer)) {
            $log('Aborted: this name has already been paid under another roster row.', [
                'name'        => $officer->full_name,
                'paid_row'    => $twin->id,
                'paid_account' => $twin->account_number,
            ]);

            // Recorded, not silent: an admin has to be able to see that this
            // person was skipped and why, in case the two really are different
            // people who happen to share a name.
            PoPayment::create([
                'po_officer_id'  => $officer->id,
                'paid_key'       => null,
                'amount'         => $this->amount,
                'bank_name'      => $officer->bank_name,
                'bank_code'      => $officer->bank_code,
                'account_number' => $officer->account_number,
                'account_name'   => $officer->account_name,
                'recipient_code' => $officer->recipient_code,
                'reference'      => 'po-dup-' . $officer->id . '-' . now()->timestamp . '-' . Str::random(6),
                'status'         => 'failed',
                'message'        => "Not paid — {$officer->full_name} was already paid under account {$twin->account_number} (roster #{$twin->id}). If these are different people, correct the roster and retry.",
            ]);

            return;
        }

        $payment = $this->claim($officer);

        if (!$payment) {
            $log('Aborted: another payment already holds this officer\'s claim. No duplicate transfer sent.');
            return;
        }

        // Pace calls so a long chain doesn't fire back-to-back at Paystack.
        usleep(1000000);

        $result = $paystack->initiateTransfer(
            $officer->recipient_code,
            (int) round($this->amount * 100),
            $payment->reference,
            'APO/PO officer payment'
        );

        if (!($result['status'] ?? false)) {
            // The request was rejected outright, so nothing moved — safe to
            // free the claim for a later retry.
            $this->release($payment, $result['message'] ?? 'Transfer failed.');
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
     * Another roster row carrying the same person's name that already holds a
     * live payment, or null if this name has not been paid.
     *
     * Compared on letters only, so casing, spacing and punctuation differences
     * ("Oke  Toba", "OKE TOBA", "Oke-Toba") still count as the same person.
     */
    private function alreadyPaidUnderAnotherRow(PoOfficer $officer): ?PoOfficer
    {
        $key = fn (PoOfficer $o) => preg_replace('/[^a-z]/', '', strtolower($o->full_name));
        $mine = $key($officer);

        if ($mine === '') {
            return null;
        }

        return PoOfficer::where('id', '!=', $officer->id)
            ->whereHas('payments', fn ($q) => $q->whereNotNull('paid_key'))
            // Cheap SQL pre-filter on surname; the exact comparison is done in
            // PHP so it matches regardless of spacing or punctuation.
            ->where('final_surname', 'like', '%' . $officer->final_surname . '%')
            ->get()
            ->first(fn (PoOfficer $other) => $key($other) === $mine);
    }

    /**
     * Insert the exclusive claim. A duplicate-key error means another payment
     * already owns this officer — the only correct response is to walk away.
     */
    private function claim(PoOfficer $officer): ?PoPayment
    {
        try {
            return PoPayment::create([
                'po_officer_id'  => $officer->id,
                'paid_key'       => $officer->id,
                'amount'         => $this->amount,
                'bank_name'      => $officer->bank_name,
                'bank_code'      => $officer->bank_code,
                'account_number' => $officer->account_number,
                'account_name'   => $officer->account_name,
                'recipient_code' => $officer->recipient_code,
                'reference'      => 'po-' . $officer->id . '-' . now()->timestamp . '-' . Str::random(6),
                'status'         => 'pending',
            ]);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000') {
                return null;
            }

            throw $e;
        }
    }

    /** Only ever called when we know for certain that no money moved. */
    private function release(PoPayment $payment, string $message): void
    {
        $payment->update(['status' => 'failed', 'paid_key' => null, 'message' => $message]);
    }

    /**
     * Anything not clearly success/failed is 'unknown' — it must never be
     * auto-retried, because retrying a transfer that actually went through is
     * exactly how someone gets paid twice.
     */
    private function normalizeStatus(?string $status): string
    {
        return match (strtolower((string) $status)) {
            'success'         => 'success',
            'failed', 'abandoned', 'reversed' => 'failed',
            'pending', 'otp', 'processing', 'queued' => 'pending',
            default           => 'unknown',
        };
    }
}
