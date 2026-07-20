<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\PurchaseDataJob;
use App\Jobs\PurchasePartyAgentDataJob;
use App\Models\Databoy;
use App\Models\DataPlan;
use App\Models\DataPurchase;
use App\Models\EasigatewayTransaction;
use App\Models\PartyAgent;
use App\Models\PartyAgentDataPurchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;

class DataPurchaseController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->query('type') === 'party_agent' ? 'party_agent' : 'databoy';

        $records = $type === 'party_agent'
            ? $this->eligiblePartyAgentsQuery()
                ->with(['dataPurchases' => fn ($q) => $q->where('status', 'failed')->latest()])
                ->orderBy('full_name')
                ->get(['id', 'full_name', 'browsing_network', 'browsing_number'])
            : $this->eligibleDataboysQuery()
                ->with(['dataPurchases' => fn ($q) => $q->where('status', 'failed')->latest()])
                ->orderBy('full_name')
                ->get(['id', 'full_name', 'browsing_network', 'browsing_number']);

        $records = $records->map(function ($record) {
            $plan = DataPlan::where('network', $record->browsing_network)->first();

            return [
                'id'                => $record->id,
                'full_name'         => $record->full_name,
                'network'           => $record->browsing_network,
                'phone_number'      => $record->browsing_number,
                'plan'              => $plan?->only(['validity', 'amount']),
                'previous_failure'  => optional($record->dataPurchases->first())->message,
            ];
        });

        return inertia('Admin/DataPurchase', [
            'type'     => $type,
            'balance'  => EasigatewayTransaction::currentBalance(),
            'databoys' => $records,
        ]);
    }

    public function send(Request $request)
    {
        $type = $request->input('type') === 'party_agent' ? 'party_agent' : 'databoy';

        $request->validate([
            'databoy_ids'   => 'required|array',
            'databoy_ids.*' => $type === 'party_agent' ? 'exists:party_agents,id' : 'exists:databoys,id',
        ]);

        // One job per record — EasiGateway's data endpoint handles a single
        // phone number per call, so jobs are chained to run strictly one
        // after another rather than batched.
        if ($type === 'party_agent') {
            $ids = $this->eligiblePartyAgentsQuery()
                ->whereIn('id', $request->databoy_ids)
                ->pluck('id');

            if ($ids->isEmpty()) {
                return back()->with('error', 'No eligible party agents were selected.');
            }

            $jobs = $ids->map(fn ($id) => new PurchasePartyAgentDataJob($id))->all();
            Bus::chain($jobs)->dispatch();

            return back()->with('success', "Queued data purchase for {$ids->count()} party agent(s). Check Data Purchase History shortly for results.");
        }

        $ids = $this->eligibleDataboysQuery()
            ->whereIn('id', $request->databoy_ids)
            ->pluck('id');

        if ($ids->isEmpty()) {
            return back()->with('error', 'No eligible databoys were selected.');
        }

        $jobs = $ids->map(fn ($id) => new PurchaseDataJob($id))->all();

        Bus::chain($jobs)->dispatch();

        return back()->with('success', "Queued data purchase for {$ids->count()} databoy(s). Check Data Purchase History shortly for results.");
    }

    public function history(Request $request)
    {
        $type = $request->query('type') === 'party_agent' ? 'party_agent' : 'databoy';

        if ($type === 'party_agent') {
            $history = PartyAgentDataPurchase::with('partyAgent:id,full_name')
                ->latest()
                ->get(['id', 'party_agent_id', 'phone_number', 'network', 'bundle_code', 'amount', 'status', 'message', 'created_at'])
                ->groupBy('party_agent_id')
                ->map(fn ($attempts) => $attempts->first())
                ->values()
                ->map(fn ($purchase) => [
                    'id'           => $purchase->id,
                    'full_name'    => $purchase->partyAgent->full_name ?? '—',
                    'phone_number' => $purchase->phone_number,
                    'network'      => $purchase->network,
                    'bundle_code'  => $purchase->bundle_code,
                    'amount'       => $purchase->amount,
                    'status'       => $purchase->status,
                    'message'      => $purchase->message,
                    'created_at'   => $purchase->created_at,
                ]);
        } else {
            $history = DataPurchase::with('databoy:id,full_name')
                ->latest()
                ->get(['id', 'databoy_id', 'phone_number', 'network', 'bundle_code', 'amount', 'status', 'message', 'created_at'])
                ->groupBy('databoy_id')
                ->map(fn ($attempts) => $attempts->first())
                ->values()
                ->map(fn ($purchase) => [
                    'id'           => $purchase->id,
                    'full_name'    => $purchase->databoy->full_name ?? '—',
                    'phone_number' => $purchase->phone_number,
                    'network'      => $purchase->network,
                    'bundle_code'  => $purchase->bundle_code,
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

        return inertia('Admin/DataPurchaseHistory', compact('history', 'stats', 'type'));
    }

    private function eligibleDataboysQuery()
    {
        return Databoy::whereNotNull('browsing_network')
            ->where('browsing_network', '!=', '')
            ->whereNotNull('browsing_number')
            ->where('browsing_number', '!=', '')
            ->whereIn('browsing_network', DataPlan::pluck('network'))
            ->whereDoesntHave('dataPurchases', fn ($q) => $q->where('status', '!=', 'failed'))
            ->withMinApplications(2);
    }

    // Party agents have no application-count eligibility gate — every party
    // agent with a supported network/number qualifies.
    private function eligiblePartyAgentsQuery()
    {
        return PartyAgent::whereNotNull('browsing_network')
            ->where('browsing_network', '!=', '')
            ->whereNotNull('browsing_number')
            ->where('browsing_number', '!=', '')
            ->whereIn('browsing_network', DataPlan::pluck('network'))
            ->whereDoesntHave('dataPurchases', fn ($q) => $q->where('status', '!=', 'failed'));
    }
}
