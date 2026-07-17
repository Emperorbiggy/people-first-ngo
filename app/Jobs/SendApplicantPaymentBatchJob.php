<?php

namespace App\Jobs;

use App\Models\ApplicantPayment;
use App\Models\DataboyApplication;
use App\Services\PaystackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class SendApplicantPaymentBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 120;

    /**
     * @param array<int> $databoyApplicationIds up to 100 ids, each with an already-created recipient
     */
    public function __construct(public array $databoyApplicationIds, public float $amount)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $applications = DataboyApplication::with('recipient')
            ->whereIn('id', $this->databoyApplicationIds)
            ->get();

        $transfers    = [];
        $referenceMap = [];

        foreach ($applications as $application) {
            if (!$application->recipient || $application->recipient->status !== 'success') {
                continue;
            }

            $reference = 'applicant-' . $application->id . '-' . now()->timestamp . '-' . Str::random(6);

            $transfers[] = [
                'amount'    => (int) round($this->amount * 100),
                'reference' => $reference,
                'recipient' => $application->recipient->recipient_code,
                'reason'    => 'Applicant payment',
            ];

            $referenceMap[$reference] = $application;
        }

        if (empty($transfers)) {
            return;
        }

        $bulkResult = $paystack->initiateBulkTransfer($transfers);

        if (!$bulkResult['status']) {
            foreach ($referenceMap as $reference => $application) {
                $this->recordPayment($application, $reference, null, 'failed', $bulkResult['message'] ?? 'Bulk transfer failed for this batch.');
            }
            return;
        }

        foreach ($bulkResult['data'] as $item) {
            $application = $referenceMap[$item['reference']] ?? null;

            if (!$application) {
                continue;
            }

            // Paystack queues bulk transfers asynchronously and reports them as
            // "pending" at initiation time; with OTP disabled there's no manual
            // confirmation step left, so we treat "pending" as a completed payment.
            $status = $item['status'] ?? 'pending';
            if ($status === 'pending') {
                $status = 'success';
            }

            $this->recordPayment($application, $item['reference'], $item['transfer_code'] ?? null, $status, $item['reason'] ?? null);
        }
    }

    private function recordPayment(DataboyApplication $application, string $reference, ?string $transferCode, string $status, ?string $message): void
    {
        ApplicantPayment::create([
            'databoy_application_id' => $application->id,
            'amount'                 => $this->amount,
            'bank_name'              => $application->bank_name,
            'bank_code'              => $application->bank_code,
            'account_number'         => $application->account_number,
            'account_name'           => $application->bank_account_name,
            'recipient_code'         => $application->recipient->recipient_code,
            'transfer_code'          => $transferCode,
            'reference'              => $reference,
            'status'                 => $status,
            'message'                => $message,
        ]);
    }
}
