<?php

namespace App\Jobs;

use App\Models\ApoFinalPayment;
use App\Services\PaystackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Pays one APO/PO final payment row.
 *
 * Double-payment defence: paid_key holds the row id under a UNIQUE index, and
 * the claim is taken with a conditional UPDATE — "set paid_key WHERE paid_key
 * IS NULL". Only one job can win that update; a duplicate dispatch affects zero
 * rows and stops before calling Paystack. The claim is released only where we
 * know for certain no money moved.
 *
 * The account number is unique on the table, so the same account cannot appear
 * on two rows and be paid twice that way either.
 */
class PayApoFinalPaymentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 90;

    public function __construct(public int $rowId, public string $narration)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $log = fn (string $msg, array $ctx = []) => Log::info("[PayApoFinalPaymentJob #{$this->rowId}] {$msg}", $ctx);

        $row = ApoFinalPayment::find($this->rowId);

        if (!$row) {
            Log::warning("[PayApoFinalPaymentJob #{$this->rowId}] Aborted: row not found.");
            return;
        }

        if ($row->recipient_status !== 'success' || !$row->recipient_code) {
            $log('Aborted: no transfer recipient on file.');
            return;
        }

        if ((float) $row->amount <= 0) {
            $log('Aborted: no amount on this row.');
            return;
        }

        $reference = 'apofinal-' . $row->id . '-' . now()->timestamp . '-' . Str::random(6);

        // Claim: only one job can move paid_key from NULL to the row id.
        $claimed = ApoFinalPayment::whereKey($row->id)
            ->whereNull('paid_key')
            ->update([
                'paid_key'       => $row->id,
                'reference'      => $reference,
                'payment_status' => 'pending',
                'paid_at'        => now(),
            ]);

        if (!$claimed) {
            $log('Aborted: this row already holds a live payment. No duplicate transfer sent.');
            return;
        }

        // Pace calls so a long run doesn't fire back-to-back at Paystack.
        usleep(1000000);

        $log('Sending transfer.', ['amount' => $row->amount, 'narration' => $this->narration]);

        $result = $paystack->initiateTransfer(
            $row->recipient_code,
            (int) round((float) $row->amount * 100),
            $reference,
            Str::limit($this->narration, 100, '')
        );

        if (!($result['status'] ?? false)) {
            // Rejected outright, so nothing moved — release the claim so this
            // row can be retried once the reason is fixed.
            ApoFinalPayment::whereKey($row->id)->update([
                'paid_key'        => null,
                'payment_status'  => 'failed',
                'payment_message' => $result['message'] ?? 'Transfer failed.',
            ]);

            $log('Transfer rejected — claim released.', ['message' => $result['message'] ?? null]);
            return;
        }

        $data = $result['data'] ?? [];

        ApoFinalPayment::whereKey($row->id)->update([
            'transfer_code'   => $data['transfer_code'] ?? null,
            'reference'       => $data['reference'] ?? $reference,
            'payment_status'  => $this->normalizeStatus($data['status'] ?? null),
            'payment_message' => $data['reason'] ?? null,
        ]);

        $log('Finished.', ['status' => $data['status'] ?? null]);
    }

    /**
     * Anything not clearly success/failed is 'unknown' and must never be
     * auto-retried — retrying a transfer that actually went through is how
     * someone gets paid twice.
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
