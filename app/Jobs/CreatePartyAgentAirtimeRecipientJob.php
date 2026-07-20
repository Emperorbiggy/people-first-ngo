<?php

namespace App\Jobs;

use App\Models\PartyAgent;
use App\Models\PartyAgentAirtimeRecipient;
use App\Services\EasiGatewayService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class CreatePartyAgentAirtimeRecipientJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 60;

    public function __construct(public int $partyAgentId)
    {
    }

    public function handle(EasiGatewayService $easiGateway): void
    {
        $partyAgent = PartyAgent::find($this->partyAgentId);

        if (!$partyAgent) {
            return;
        }

        if (!$partyAgent->browsing_network || !$partyAgent->browsing_number) {
            $this->record($partyAgent, null, null, 'failed', 'Missing browsing network or phone number.');
            return;
        }

        // Block duplicate payouts: if another party agent already has a
        // successfully created recipient for the same phone number, skip.
        $duplicate = PartyAgentAirtimeRecipient::where('phone_number', $partyAgent->browsing_number)
            ->where('status', 'success')
            ->where('party_agent_id', '!=', $partyAgent->id)
            ->with('partyAgent:id,full_name')
            ->first();

        if ($duplicate) {
            $this->record(
                $partyAgent,
                $partyAgent->browsing_number,
                null,
                'failed',
                'Duplicate phone number — already used by ' . ($duplicate->partyAgent->full_name ?? 'another party agent') . '.'
            );
            return;
        }

        $categories = $easiGateway->getServiceCategories();

        if ($categories['status'] !== 'success' || empty($categories['data'])) {
            $this->record($partyAgent, $partyAgent->browsing_number, null, 'failed', 'Could not fetch service categories from EasiGateway.');
            return;
        }

        $match = collect($categories['data'])->first(
            fn ($category) => strtolower($category['name'] ?? '') === strtolower($partyAgent->browsing_network)
        );

        if (!$match) {
            $this->record($partyAgent, $partyAgent->browsing_number, null, 'failed', "No matching service category found for network '{$partyAgent->browsing_network}'.");
            return;
        }

        $this->record($partyAgent, $partyAgent->browsing_number, $match['_id'], 'success', null);
    }

    private function record(PartyAgent $partyAgent, ?string $phone, ?string $serviceCategoryId, string $status, ?string $message): void
    {
        PartyAgentAirtimeRecipient::updateOrCreate(
            ['party_agent_id' => $partyAgent->id],
            [
                'phone_number'         => $phone ?? $partyAgent->browsing_number ?? '',
                'network'              => $partyAgent->browsing_network ?? '',
                'service_category_id'  => $serviceCategoryId,
                'status'               => $status,
                'message'              => $message,
            ]
        );
    }
}
