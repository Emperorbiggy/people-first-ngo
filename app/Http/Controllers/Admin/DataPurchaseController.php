<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\PurchaseDataJob;
use App\Models\Databoy;
use App\Models\DataPlan;
use App\Models\DataPurchase;
use App\Models\EasigatewayTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;

class DataPurchaseController extends Controller
{
    public function index()
    {
        $databoys = $this->eligibleDataboysQuery()
            ->with(['dataPurchases' => fn ($q) => $q->where('status', 'failed')->latest()])
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'browsing_network', 'browsing_number'])
            ->map(function ($db) {
                $plan = DataPlan::where('network', $db->browsing_network)->first();

                return [
                    'id'                => $db->id,
                    'full_name'         => $db->full_name,
                    'network'           => $db->browsing_network,
                    'phone_number'      => $db->browsing_number,
                    'plan'              => $plan?->only(['validity', 'amount']),
                    'previous_failure'  => optional($db->dataPurchases->first())->message,
                ];
            });

        return inertia('Admin/DataPurchase', [
            'balance'  => EasigatewayTransaction::currentBalance(),
            'databoys' => $databoys,
        ]);
    }

    public function send(Request $request)
    {
        $request->validate([
            'databoy_ids'   => 'required|array',
            'databoy_ids.*' => 'exists:databoys,id',
        ]);

        $ids = $this->eligibleDataboysQuery()
            ->whereIn('id', $request->databoy_ids)
            ->pluck('id');

        if ($ids->isEmpty()) {
            return back()->with('error', 'No eligible databoys were selected.');
        }

        // One job per databoy — EasiGateway's data endpoint handles a single
        // phone number per call, so jobs are chained to run strictly one
        // after another rather than batched.
        $jobs = $ids->map(fn ($id) => new PurchaseDataJob($id))->all();

        Bus::chain($jobs)->dispatch();

        return back()->with('success', "Queued data purchase for {$ids->count()} databoy(s). Check Data Purchase History shortly for results.");
    }

    public function history()
    {
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

        $stats = [
            'total'       => $history->count(),
            'success'     => $history->where('status', 'success')->count(),
            'failed'      => $history->where('status', 'failed')->count(),
            'amount_sent' => $history->where('status', 'success')->sum('amount'),
        ];

        return inertia('Admin/DataPurchaseHistory', compact('history', 'stats'));
    }

    private function eligibleDataboysQuery()
    {
        return Databoy::whereNotNull('browsing_network')
            ->where('browsing_network', '!=', '')
            ->whereNotNull('browsing_number')
            ->where('browsing_number', '!=', '')
            ->whereIn('browsing_network', DataPlan::pluck('network'))
            ->whereDoesntHave('dataPurchases', fn ($q) => $q->where('status', '!=', 'failed'));
    }
}
