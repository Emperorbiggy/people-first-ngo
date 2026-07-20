<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\PurchaseAirtimeJob;
use App\Jobs\PurchasePartyAgentAirtimeJob;
use App\Models\AirtimePurchase;
use App\Models\Databoy;
use App\Models\EasigatewayTransaction;
use App\Models\PartyAgent;
use App\Models\PartyAgentAirtimePurchase;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;

class AirtimeController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->query('type') === 'party_agent' ? 'party_agent' : 'databoy';

        $recipients = $type === 'party_agent'
            ? $this->eligiblePartyAgentsQuery()
                ->with(['airtimeRecipient', 'airtimePurchases' => fn ($q) => $q->where('status', 'failed')->latest()])
                ->orderBy('full_name')
                ->get(['id', 'full_name'])
            : $this->eligibleDataboysQuery()
                ->with(['airtimeRecipient', 'airtimePurchases' => fn ($q) => $q->where('status', 'failed')->latest()])
                ->orderBy('full_name')
                ->get(['id', 'full_name']);

        $recipients = $recipients->map(fn ($record) => [
            'id'                => $record->id,
            'full_name'         => $record->full_name,
            'phone_number'      => $record->airtimeRecipient->phone_number,
            'network'           => $record->airtimeRecipient->network,
            'previous_failure'  => optional($record->airtimePurchases->first())->message,
        ]);

        return inertia('Admin/Airtime', [
            'type'          => $type,
            'airtimeAmount' => Setting::get('airtime_amount', ''),
            'balance'       => EasigatewayTransaction::currentBalance(),
            'databoys'      => $recipients,
        ]);
    }

    public function send(Request $request)
    {
        $type = $request->input('type') === 'party_agent' ? 'party_agent' : 'databoy';

        $request->validate([
            'databoy_ids'   => 'required|array',
            'databoy_ids.*' => $type === 'party_agent' ? 'exists:party_agents,id' : 'exists:databoys,id',
        ]);

        $amount = (float) Setting::get('airtime_amount', 0);

        if ($amount <= 0) {
            return back()->withErrors(['amount' => 'Set an airtime amount in Settings before sending airtime.']);
        }

        // One job per recipient — EasiGateway's airtime endpoint handles a
        // single phone number per call, so jobs are chained to run strictly
        // one after another rather than batched.
        if ($type === 'party_agent') {
            $ids = $this->eligiblePartyAgentsQuery()
                ->whereIn('id', $request->databoy_ids)
                ->pluck('id');

            if ($ids->isEmpty()) {
                return back()->with('error', 'No eligible party agents were selected.');
            }

            $jobs = $ids->map(fn ($id) => new PurchasePartyAgentAirtimeJob($id, $amount))->all();
            Bus::chain($jobs)->dispatch();

            return back()->with('success', "Queued airtime for {$ids->count()} party agent(s). Check Airtime History shortly for results.");
        }

        $ids = $this->eligibleDataboysQuery()
            ->whereIn('id', $request->databoy_ids)
            ->pluck('id');

        if ($ids->isEmpty()) {
            return back()->with('error', 'No eligible databoys were selected.');
        }

        $jobs = $ids->map(fn ($id) => new PurchaseAirtimeJob($id, $amount))->all();

        Bus::chain($jobs)->dispatch();

        return back()->with('success', "Queued airtime for {$ids->count()} databoy(s). Check Airtime History shortly for results.");
    }

    public function history(Request $request)
    {
        $type = $request->query('type') === 'party_agent' ? 'party_agent' : 'databoy';

        if ($type === 'party_agent') {
            $history = PartyAgentAirtimePurchase::with('partyAgent:id,full_name')
                ->latest()
                ->get(['id', 'party_agent_id', 'phone_number', 'network', 'amount', 'status', 'message', 'created_at'])
                ->groupBy('party_agent_id')
                ->map(fn ($attempts) => $attempts->first())
                ->values()
                ->map(fn ($purchase) => [
                    'id'           => $purchase->id,
                    'full_name'    => $purchase->partyAgent->full_name ?? '—',
                    'phone_number' => $purchase->phone_number,
                    'network'      => $purchase->network,
                    'amount'       => $purchase->amount,
                    'status'       => $purchase->status,
                    'message'      => $purchase->message,
                    'created_at'   => $purchase->created_at,
                ]);
        } else {
            $history = AirtimePurchase::with('databoy:id,full_name')
                ->latest()
                ->get(['id', 'databoy_id', 'phone_number', 'network', 'amount', 'status', 'message', 'created_at'])
                ->groupBy('databoy_id')
                ->map(fn ($attempts) => $attempts->first())
                ->values()
                ->map(fn ($purchase) => [
                    'id'           => $purchase->id,
                    'full_name'    => $purchase->databoy->full_name ?? '—',
                    'phone_number' => $purchase->phone_number,
                    'network'      => $purchase->network,
                    'amount'       => $purchase->amount,
                    'status'       => $purchase->status,
                    'message'      => $purchase->message,
                    'created_at'   => $purchase->created_at,
                ]);
        }

        $stats = [
            'total'       => $history->count(),
            'success'     => $history->where('status', 'success')->count(),
            'failed'      => $history->where('status', 'failed')->count(),
            'amount_sent' => $history->where('status', 'success')->sum('amount'),
        ];

        return inertia('Admin/AirtimeHistory', compact('history', 'stats', 'type'));
    }

    private function eligibleDataboysQuery()
    {
        return Databoy::whereHas('airtimeRecipient', fn ($q) => $q->where('status', 'success'))
            ->whereDoesntHave('airtimePurchases', fn ($q) => $q->where('status', '!=', 'failed'))
            ->withMinApplications(2);
    }

    // Party agents have no application-count eligibility gate — every party
    // agent with a successfully created recipient qualifies.
    private function eligiblePartyAgentsQuery()
    {
        return PartyAgent::whereHas('airtimeRecipient', fn ($q) => $q->where('status', 'success'))
            ->whereDoesntHave('airtimePurchases', fn ($q) => $q->where('status', '!=', 'failed'));
    }
}
