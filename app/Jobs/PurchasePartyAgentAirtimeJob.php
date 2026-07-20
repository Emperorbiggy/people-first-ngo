<?php

namespace App\Jobs;

use App\Models\EasigatewayTransaction;
use App\Models\PartyAgent;
use App\Models\PartyAgentAirtimePurchase;
use App\Services\EasiGatewayService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class PurchasePartyAgentAirtimeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 120;

    public function __construct(public int $partyAgentId, public float $amount)
    {
    }

    public function handle(EasiGatewayService $easiGateway): void
    {
        $partyAgent = PartyAgent::with('airtimeRecipient')->find($this->partyAgentId);

        if (!$partyAgent || !$partyAgent->airtimeRecipient || $partyAgent->airtimeRecipient->status !== 'success') {
            return;
        }

        $recipient = $partyAgent->airtimeRecipient;

        // Skip if this phone number has already been successfully topped up
        // in a previous run — never send airtime to the same number twice.
        $duplicate = PartyAgentAirtimePurchase::where('phone_number', $recipient->phone_number)
            ->where('status', 'success')
            ->exists();

        if ($duplicate) {
            PartyAgentAirtimePurchase::create([
                'party_agent_id'       => $partyAgent->id,
                'phone_number'         => $recipient->phone_number,
                'network'              => $recipient->network,
                'service_category_id'  => $recipient->service_category_id,
                'amount'               => $this->amount,
                'status'               => 'failed',
                'message'              => 'Duplicate phone number — already purchased.',
            ]);
            return;
        }

        // Pace calls so a burst of queued jobs doesn't fire EasiGateway
        // requests back-to-back with zero gap (EasiGateway runs on a
        // Render.com instance that can be slow to respond under load).
        usleep(1000000);

        $result = $easiGateway->purchase($recipient->phone_number, $recipient->service_category_id, (int) $this->amount);

        $purchase = PartyAgentAirtimePurchase::create([
            'party_agent_id'       => $partyAgent->id,
            'phone_number'         => $recipient->phone_number,
            'network'              => $recipient->network,
            'service_category_id'  => $recipient->service_category_id,
            'amount'               => $this->amount,
            'status'               => $result['status'] === 'success' ? 'success' : 'failed',
            'message'              => $result['status'] === 'success' ? null : ($result['message'] ?? 'Airtime purchase failed.'),
        ]);

        if ($purchase->status === 'success') {
            EasigatewayTransaction::record(
                'debit',
                $this->amount,
                "Airtime purchase for {$recipient->phone_number} ({$recipient->network})",
                $purchase
            );
        }
    }
}
