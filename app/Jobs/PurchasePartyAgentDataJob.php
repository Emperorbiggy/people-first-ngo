<?php

namespace App\Jobs;

use App\Models\DataPlan;
use App\Models\EasigatewayTransaction;
use App\Models\PartyAgent;
use App\Models\PartyAgentDataPurchase;
use App\Services\EasiGatewayService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Buys one party agent's data bundle. Dispatched as a Bus::chain of many of
 * these (one per party agent) so EasiGateway calls happen strictly one after
 * another, never in a burst.
 *
 * Like the databoy equivalent, no separate "recipient" record is needed —
 * the service category + bundle is resolved per network via the
 * admin-configured DataPlan, read straight from there.
 */
class PurchasePartyAgentDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 120;

    public function __construct(public int $partyAgentId)
    {
    }

    public function handle(EasiGatewayService $easiGateway): void
    {
        $partyAgent = PartyAgent::find($this->partyAgentId);

        if (!$partyAgent || !$partyAgent->browsing_network || !$partyAgent->browsing_number) {
            return;
        }

        // A party agent with any non-failed purchase has already received
        // their data bundle and must never be bought for again.
        $alreadyBought = PartyAgentDataPurchase::where('party_agent_id', $partyAgent->id)
            ->where('status', '!=', 'failed')
            ->exists();

        if ($alreadyBought) {
            return;
        }

        $plan = DataPlan::where('network', $partyAgent->browsing_network)->first();

        if (!$plan) {
            PartyAgentDataPurchase::create([
                'party_agent_id'       => $partyAgent->id,
                'phone_number'         => $partyAgent->browsing_number,
                'network'              => $partyAgent->browsing_network,
                'service_category_id'  => null,
                'bundle_code'          => null,
                'amount'               => 0,
                'status'               => 'failed',
                'message'              => "No data plan configured for {$partyAgent->browsing_network}. Set one in Data Plans.",
            ]);
            return;
        }

        // Skip if this phone number has already been successfully topped up
        // in a previous run — never buy data for the same number twice.
        $duplicatePhone = PartyAgentDataPurchase::where('phone_number', $partyAgent->browsing_number)
            ->where('status', 'success')
            ->exists();

        if ($duplicatePhone) {
            PartyAgentDataPurchase::create([
                'party_agent_id'       => $partyAgent->id,
                'phone_number'         => $partyAgent->browsing_number,
                'network'              => $partyAgent->browsing_network,
                'service_category_id'  => $plan->service_category_id,
                'bundle_code'          => $plan->bundle_code,
                'amount'               => $plan->amount,
                'status'               => 'failed',
                'message'              => 'Duplicate phone number — already purchased.',
            ]);
            return;
        }

        // Pace calls so a burst of queued jobs doesn't fire EasiGateway
        // requests back-to-back with zero gap (EasiGateway runs on a
        // Render.com instance that can be slow to respond under load).
        usleep(1000000);

        $result = $easiGateway->purchaseData(
            $partyAgent->browsing_number,
            $plan->service_category_id,
            $plan->bundle_code,
            (int) $plan->amount
        );

        $purchase = PartyAgentDataPurchase::create([
            'party_agent_id'       => $partyAgent->id,
            'phone_number'         => $partyAgent->browsing_number,
            'network'              => $partyAgent->browsing_network,
            'service_category_id'  => $plan->service_category_id,
            'bundle_code'          => $plan->bundle_code,
            'amount'               => $plan->amount,
            'status'               => $result['status'] === 'success' ? 'success' : 'failed',
            'message'              => $result['status'] === 'success' ? null : ($result['message'] ?? 'Data purchase failed.'),
        ]);

        if ($purchase->status === 'success') {
            EasigatewayTransaction::record(
                'debit',
                (float) $plan->amount,
                "Data purchase for {$partyAgent->browsing_number} ({$partyAgent->browsing_network})",
                $purchase
            );
        }
    }
}
