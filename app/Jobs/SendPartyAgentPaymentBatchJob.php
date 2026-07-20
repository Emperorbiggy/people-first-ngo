<?php

namespace App\Jobs;

use App\Jobs\Concerns\PersistsApplicantPayments;
use App\Models\PartyAgent;
use App\Models\PartyAgentPayment;
use App\Services\PaystackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendPartyAgentPaymentBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, PersistsApplicantPayments;

    public int $tries = 1;
    public int $timeout = 120;

    /**
     * @param array<int> $partyAgentIds up to 100 ids, each with an already-created recipient
     */
    public function __construct(public array $partyAgentIds, public float $amount)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $partyAgents = PartyAgent::with('recipient')
            ->whereIn('id', $this->partyAgentIds)
            ->get();

        $transfers    = [];
        $referenceMap = [];

        foreach ($partyAgents as $partyAgent) {
            if (!$partyAgent->recipient || $partyAgent->recipient->status !== 'success') {
                continue;
            }

            if ($this->alreadyPaid($partyAgent)) {
                continue;
            }

            $reference = $this->generateApplicantReference($partyAgent, 'party-agent');

            $transfers[] = [
                'amount'    => (int) round($this->amount * 100),
                'reference' => $reference,
                'recipient' => $partyAgent->recipient->recipient_code,
                'reason'    => 'Party agent payment',
            ];

            $referenceMap[$reference] = $partyAgent;
        }

        if (empty($transfers)) {
            return;
        }

        $bulkResult = $paystack->initiateBulkTransfer($transfers);

        if (!$bulkResult['status']) {
            foreach ($referenceMap as $reference => $partyAgent) {
                $this->recordApplicantPayment($partyAgent, $this->amount, $reference, null, 'failed', $bulkResult['message'] ?? 'Bulk transfer failed for this batch.');
            }
            return;
        }

        foreach ($bulkResult['data'] as $item) {
            $partyAgent = $referenceMap[$item['reference']] ?? null;

            if (!$partyAgent) {
                continue;
            }

            $status = $this->normalizeTransferStatus($item['status'] ?? null);

            $this->recordApplicantPayment($partyAgent, $this->amount, $item['reference'], $item['transfer_code'] ?? null, $status, $item['reason'] ?? null);
        }
    }

    protected function paymentModelClass(): string
    {
        return PartyAgentPayment::class;
    }

    protected function paymentForeignKey(): string
    {
        return 'party_agent_id';
    }
}
