<?php

namespace App\Jobs;

use App\Jobs\Concerns\PersistsApplicantPayments;
use App\Models\ApplicantPayment;
use App\Models\DataboyApplication;
use App\Services\PaystackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendApplicantPaymentBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, PersistsApplicantPayments;

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

            if ($this->alreadyPaid($application)) {
                continue;
            }

            $reference = $this->generateApplicantReference($application);

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
                $this->recordApplicantPayment($application, $this->amount, $reference, null, 'failed', $bulkResult['message'] ?? 'Bulk transfer failed for this batch.');
            }
            return;
        }

        foreach ($bulkResult['data'] as $item) {
            $application = $referenceMap[$item['reference']] ?? null;

            if (!$application) {
                continue;
            }

            $status = $this->normalizeTransferStatus($item['status'] ?? null);

            $this->recordApplicantPayment($application, $this->amount, $item['reference'], $item['transfer_code'] ?? null, $status, $item['reason'] ?? null);
        }
    }

    protected function paymentModelClass(): string
    {
        return ApplicantPayment::class;
    }

    protected function paymentForeignKey(): string
    {
        return 'databoy_application_id';
    }
}
