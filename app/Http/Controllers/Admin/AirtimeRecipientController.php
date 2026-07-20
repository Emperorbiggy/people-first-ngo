<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\CreateAirtimeRecipientJob;
use App\Jobs\CreatePartyAgentAirtimeRecipientJob;
use App\Models\Databoy;
use App\Models\PartyAgent;
use Illuminate\Http\Request;

class AirtimeRecipientController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->query('type') === 'party_agent' ? 'party_agent' : 'databoy';

        $records = $type === 'party_agent'
            ? $this->eligiblePartyAgentsQuery()
                ->with('airtimeRecipient')
                ->orderBy('full_name')
                ->get(['id', 'full_name', 'browsing_network', 'browsing_number'])
            : $this->eligibleDataboysQuery()
                ->with('airtimeRecipient')
                ->orderBy('full_name')
                ->get(['id', 'full_name', 'browsing_network', 'browsing_number']);

        $records = $records->map(fn ($record) => [
            'id'                => $record->id,
            'full_name'         => $record->full_name,
            'browsing_network'  => $record->browsing_network,
            'browsing_number'   => $record->browsing_number,
            'recipient_status'  => $record->airtimeRecipient->status ?? null,
            'recipient_message' => $record->airtimeRecipient->message ?? null,
        ]);

        return inertia('Admin/AirtimeRecipients', [
            'type'     => $type,
            'databoys' => $records,
        ]);
    }

    public function create(Request $request)
    {
        $type = $request->input('type') === 'party_agent' ? 'party_agent' : 'databoy';

        if ($type === 'party_agent') {
            $ids = $this->eligiblePartyAgentsQuery()
                ->whereDoesntHave('airtimeRecipient', fn ($q) => $q->where('status', 'success'))
                ->pluck('id');

            if ($ids->isEmpty()) {
                return back()->with('error', 'No party agents are pending recipient creation.');
            }

            foreach ($ids as $id) {
                CreatePartyAgentAirtimeRecipientJob::dispatch($id);
            }

            return back()->with('success', "Queued recipient creation for {$ids->count()} party agent(s). Refresh shortly to see progress.");
        }

        $ids = $this->eligibleDataboysQuery()
            ->whereDoesntHave('airtimeRecipient', fn ($q) => $q->where('status', 'success'))
            ->pluck('id');

        if ($ids->isEmpty()) {
            return back()->with('error', 'No databoys are pending recipient creation.');
        }

        foreach ($ids as $id) {
            CreateAirtimeRecipientJob::dispatch($id);
        }

        return back()->with('success', "Queued recipient creation for {$ids->count()} databoy(s). Refresh shortly to see progress.");
    }

    private function eligibleDataboysQuery()
    {
        return Databoy::whereNotNull('browsing_network')
            ->where('browsing_network', '!=', '')
            ->whereNotNull('browsing_number')
            ->where('browsing_number', '!=', '');
    }

    // Party agents have no application-count eligibility gate — every
    // registered party agent with a network/number qualifies.
    private function eligiblePartyAgentsQuery()
    {
        return PartyAgent::whereNotNull('browsing_network')
            ->where('browsing_network', '!=', '')
            ->whereNotNull('browsing_number')
            ->where('browsing_number', '!=', '');
    }
}
