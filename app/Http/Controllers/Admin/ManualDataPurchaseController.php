<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Databoy;
use App\Models\DataPlan;
use App\Models\DataPurchase;
use App\Models\EasigatewayTransaction;
use App\Models\PartyAgent;
use App\Models\PartyAgentDataPurchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Records data purchases that were carried out by hand, outside the system,
 * WITHOUT calling EasiGateway. The rows written are identical to those a real
 * purchase writes — same tables, same columns, same balance debit — so history
 * and the running balance line up with what was actually bought.
 *
 * Deliberately absent from the sidebar: it moves the balance without buying
 * anything, so it is reached by URL only.
 */
class ManualDataPurchaseController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->query('type') === 'party_agent' ? 'party_agent' : 'databoy';

        $records = ($type === 'party_agent' ? $this->eligiblePartyAgentsQuery() : $this->eligibleDataboysQuery())
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'browsing_network', 'browsing_number'])
            ->map(function ($record) {
                $plan = DataPlan::where('network', $record->browsing_network)->first();

                return [
                    'id'           => $record->id,
                    'full_name'    => $record->full_name,
                    'network'      => $record->browsing_network,
                    'phone_number' => $record->browsing_number,
                    'plan'         => $plan?->only(['validity', 'amount']),
                ];
            });

        return inertia('Admin/ManualDataPurchase', [
            'type'     => $type,
            'balance'  => EasigatewayTransaction::currentBalance(),
            'databoys' => $records,
        ]);
    }

    public function store(Request $request)
    {
        $type = $request->input('type') === 'party_agent' ? 'party_agent' : 'databoy';

        $request->validate([
            'databoy_ids'   => 'required|array|min:1',
            'databoy_ids.*' => $type === 'party_agent' ? 'exists:party_agents,id' : 'exists:databoys,id',
        ]);

        $records = ($type === 'party_agent' ? $this->eligiblePartyAgentsQuery() : $this->eligibleDataboysQuery())
            ->whereIn('id', $request->databoy_ids)
            ->get();

        if ($records->isEmpty()) {
            return back()->with('error', 'None of the selected records are eligible — they may already have a purchase on record.');
        }

        $recorded = 0;
        $skipped  = 0;

        foreach ($records as $record) {
            $plan = DataPlan::where('network', $record->browsing_network)->first();

            if (!$plan) {
                $skipped++;
                continue;
            }

            // One transaction per record so a mid-run failure can't leave a
            // purchase row without its matching balance debit.
            DB::transaction(function () use ($record, $plan, $type, &$recorded) {
                $payload = [
                    'phone_number'        => $record->browsing_number,
                    'network'             => $record->browsing_network,
                    'service_category_id' => $plan->service_category_id,
                    'bundle_code'         => $plan->bundle_code,
                    'amount'              => $plan->amount,
                    'status'              => 'success',
                    'message'             => null,
                ];

                $purchase = $type === 'party_agent'
                    ? PartyAgentDataPurchase::create($payload + ['party_agent_id' => $record->id])
                    : DataPurchase::create($payload + ['databoy_id' => $record->id]);

                EasigatewayTransaction::record(
                    'debit',
                    (float) $plan->amount,
                    "Data purchase for {$record->browsing_number} ({$record->browsing_network})",
                    $purchase
                );

                $recorded++;
            });
        }

        $message = "Recorded {$recorded}  data purchase(s) and debited the balance.";

        if ($skipped) {
            $message .= " {$skipped} skipped — no data plan configured for their network.";
        }

        return back()->with('success', $message);
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
