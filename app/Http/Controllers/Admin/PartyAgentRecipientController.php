<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\CreatePartyAgentRecipientJob;
use App\Models\PartyAgent;

class PartyAgentRecipientController extends Controller
{
    public function index()
    {
        $partyAgents = $this->eligiblePartyAgentsQuery()
            ->with('recipient')
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'calling_phone_number', 'bank_name', 'account_number', 'bank_account_name'])
            ->map(fn ($agent) => [
                'id'                   => $agent->id,
                'full_name'            => $agent->full_name,
                'calling_phone_number' => $agent->calling_phone_number,
                'bank_name'            => $agent->bank_name,
                'account_number'       => $agent->account_number,
                'bank_account_name'    => $agent->bank_account_name,
                'recipient_status'     => $agent->recipient->status ?? null,
                'recipient_message'    => $agent->recipient->message ?? null,
            ]);

        return inertia('Admin/PartyAgentRecipients', [
            'partyAgents' => $partyAgents,
        ]);
    }

    public function create()
    {
        $ids = $this->eligiblePartyAgentsQuery()
            ->whereDoesntHave('recipient', fn ($q) => $q->where('status', 'success'))
            ->pluck('id');

        if ($ids->isEmpty()) {
            return back()->with('error', 'No party agents are pending recipient creation.');
        }

        foreach ($ids as $id) {
            CreatePartyAgentRecipientJob::dispatch($id);
        }

        return back()->with('success', "Queued recipient creation for {$ids->count()} party agent(s). Refresh shortly to see progress.");
    }

    private function eligiblePartyAgentsQuery()
    {
        return PartyAgent::whereNotNull('bank_code')
            ->where('bank_code', '!=', '')
            ->whereNotNull('account_number')
            ->where('account_number', '!=', '');
    }
}
