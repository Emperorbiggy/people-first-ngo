<?php

namespace App\Jobs;

use App\Models\BulkTransferBatch;
use App\Models\BulkTransferPayment;
use App\Models\BulkTransferRecipient;
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
 * Pays one imported recipient.
 *
 * Double-payment defence: bulk_transfer_payments.paid_key holds the recipient
 * row id under a UNIQUE index. Winning that insert is what grants the right to
 * transfer, so a duplicate dispatch loses the insert and walks away without
 * calling Paystack. The claim is released only where we know for certain no
 * money moved, which allows a genuine retry without ever risking a second
 * transfer.
 */
class PayBulkTransferRecipientJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 90;

    public function __construct(public int $recipientId, public float $amount, public ?string $reason = null)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $log = fn (string $msg, array $ctx = []) => Log::info("[PayBulkTransferRecipientJob #{$this->recipientId}] {$msg}", $ctx);

        $row = BulkTransferRecipient::find($this->recipientId);

        if (!$row) {
            Log::warning("[PayBulkTransferRecipientJob #{$this->recipientId}] Aborted: recipient not found.");
            return;
        }

        if ($this->amount <= 0) {
            $log('Aborted: amount is zero.');
            return;
        }

        if ($row->recipient_status !== 'success' || !$row->recipient_code) {
            $log('Aborted: no transfer recipient on file.');
            return;
        }

        // Row remark wins, then the batch's, then the standing default — so a
        // transfer always carries a narration a recipient can recognise, and
        // never the generic "Bulk transfer" it used to.
        $reason = Str::limit(
            $this->reason ?: ($row->remark ?: ($row->batch?->remark ?: BulkTransferBatch::DEFAULT_REMARK)),
            100,
            ''
        );

        $payment = $this->claim($row);

        if (!$payment) {
            $log('Aborted: another payment already holds this claim. No duplicate transfer sent.');
            return;
        }

        // Pace calls so a long run doesn't fire back-to-back at Paystack.
        usleep(1000000);

        $log('Sending transfer.', [
            'amount' => $this->amount,
            'reason' => $reason,
            'source' => $this->reason ? 'dispatch' : ($row->remark ? 'row remark' : 'batch remark'),
        ]);

        $result = $paystack->initiateTransfer(
            $row->recipient_code,
            (int) round($this->amount * 100),
            $payment->reference,
            $reason
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

    private function claim(BulkTransferRecipient $row): ?BulkTransferPayment
    {
        try {
            return BulkTransferPayment::create([
                'bulk_transfer_recipient_id' => $row->id,
                'paid_key'                   => $row->id,
                'amount'                     => $this->amount,
                'bank_name'                  => $row->bank_name,
                'bank_code'                  => $row->bank_code,
                'account_number'             => $row->account_number,
                'account_name'               => $row->account_name,
                'recipient_code'             => $row->recipient_code,
                'reference'                  => 'bt-' . $row->id . '-' . now()->timestamp . '-' . Str::random(6),
                'status'                     => 'pending',
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
     * auto-retried — retrying a transfer that actually went through is exactly
     * how someone gets paid twice.
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
