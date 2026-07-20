<?php

namespace App\Jobs;

use App\Models\Databoy;
use App\Models\DataboyAccreditationPayment;
use App\Models\Setting;
use App\Services\PaystackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Pays a databoy for having done accreditation work on a given day — once
 * per calendar day, no matter how many people they check out that day.
 *
 * Dispatched manually from Admin\DataboyAccreditationPaymentController::pay(),
 * not automatically on checkout, for whichever work day (today or an unpaid
 * earlier day) the admin selects; the "already paid" guard below (scoped to
 * that specific date) enforces the once-a-day rule regardless of how many
 * times this job is dispatched for the same databoy/day.
 */
class PayDataboyAccreditationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 120;

    public function __construct(public int $databoyId, public ?string $paymentDate = null)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $log = fn (string $msg, array $context = []) => Log::info("[PayDataboyAccreditationJob #{$this->databoyId}] {$msg}", $context);

        $databoy = Databoy::with('accreditationRecipient')->find($this->databoyId);

        if (!$databoy) {
            return;
        }

        $date = $this->paymentDate ?? now()->toDateString();

        if ($this->alreadyPaidForDate($databoy->id, $date)) {
            $log("Aborted: already paid for {$date}.");
            return;
        }

        $amount = (float) Setting::get('accreditation_databoy_amount', 0);

        if ($amount <= 0) {
            $this->record($databoy, $date, 0, null, 'failed', 'Databoy accreditation amount not configured — set it in Settings.');
            return;
        }

        if (!$databoy->accreditationRecipient || $databoy->accreditationRecipient->status !== 'success') {
            CreateDataboyRecipientJob::dispatchSync($databoy->id);
            $databoy->refresh();
            $databoy->load('accreditationRecipient');
        }

        if (!$databoy->accreditationRecipient || $databoy->accreditationRecipient->status !== 'success') {
            $this->record($databoy, $date, $amount, null, 'failed', $databoy->accreditationRecipient->message ?? 'Failed to create transfer recipient.');
            return;
        }

        // Re-check right before the transfer — closes the race window between
        // the guard above and the (potentially slow) recipient-creation call.
        if ($this->alreadyPaidForDate($databoy->id, $date)) {
            $log('Aborted: paid by another process while this job was running (race-condition guard).');
            return;
        }

        usleep(1000000);

        $reference = 'databoy-accreditation-' . $databoy->id . '-' . now()->timestamp . '-' . Str::random(6);

        $result = $paystack->initiateTransfer(
            $databoy->accreditationRecipient->recipient_code,
            (int) round($amount * 100),
            $reference,
            'Databoy accreditation payment'
        );

        if (!$result['status']) {
            $this->record($databoy, $date, $amount, null, 'failed', $result['message'] ?? 'Transfer failed.');
            return;
        }

        $data   = $result['data'] ?? [];
        $status = ($data['status'] ?? null) === null || ($data['status'] ?? null) === 'pending' ? 'success' : $data['status'];

        $this->record($databoy, $date, $amount, $data['transfer_code'] ?? null, $status, $data['reason'] ?? null, $data['reference'] ?? $reference);

        $log('Finished.', ['status' => $status]);
    }

    private function alreadyPaidForDate(int $databoyId, string $date): bool
    {
        return DataboyAccreditationPayment::where('databoy_id', $databoyId)
            ->where('payment_date', $date)
            ->where('status', '!=', 'failed')
            ->exists();
    }

    private function record(Databoy $databoy, string $date, float $amount, ?string $transferCode, string $status, ?string $message, ?string $reference = null): void
    {
        DataboyAccreditationPayment::create([
            'databoy_id'      => $databoy->id,
            'payment_date'    => $date,
            'amount'          => $amount,
            'bank_name'       => $databoy->bank_name,
            'bank_code'       => $databoy->bank_code,
            'account_number'  => $databoy->account_number,
            'account_name'    => $databoy->bank_account_name,
            'recipient_code'  => $databoy->accreditationRecipient->recipient_code ?? null,
            'transfer_code'   => $transferCode,
            'reference'       => $reference ?? ('databoy-accreditation-' . $databoy->id . '-' . now()->timestamp . '-' . Str::random(6)),
            'status'          => $status,
            'message'         => $message,
        ]);
    }
}
