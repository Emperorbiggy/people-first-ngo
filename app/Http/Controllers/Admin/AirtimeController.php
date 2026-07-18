<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\PurchaseAirtimeJob;
use App\Models\AirtimePurchase;
use App\Models\Databoy;
use App\Models\EasigatewayTransaction;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;

class AirtimeController extends Controller
{
    public function index()
    {
        $databoys = $this->eligibleDataboysQuery()
            ->with(['airtimeRecipient', 'airtimePurchases' => fn ($q) => $q->where('status', 'failed')->latest()])
            ->orderBy('full_name')
            ->get(['id', 'full_name'])
            ->map(fn ($db) => [
                'id'                => $db->id,
                'full_name'         => $db->full_name,
                'phone_number'      => $db->airtimeRecipient->phone_number,
                'network'           => $db->airtimeRecipient->network,
                'previous_failure'  => optional($db->airtimePurchases->first())->message,
            ]);

        return inertia('Admin/Airtime', [
            'airtimeAmount' => Setting::get('airtime_amount', ''),
            'balance'       => EasigatewayTransaction::currentBalance(),
            'databoys'      => $databoys,
        ]);
    }

    public function send(Request $request)
    {
        $request->validate([
            'databoy_ids'   => 'required|array',
            'databoy_ids.*' => 'exists:databoys,id',
        ]);

        $amount = (float) Setting::get('airtime_amount', 0);

        if ($amount <= 0) {
            return back()->withErrors(['amount' => 'Set an airtime amount in Settings before sending airtime.']);
        }

        $ids = $this->eligibleDataboysQuery()
            ->whereIn('id', $request->databoy_ids)
            ->pluck('id');

        if ($ids->isEmpty()) {
            return back()->with('error', 'No eligible databoys were selected.');
        }

        // One job per recipient — EasiGateway's airtime endpoint handles a
        // single phone number per call, so jobs are chained to run strictly
        // one after another rather than batched.
        $jobs = $ids->map(fn ($id) => new PurchaseAirtimeJob($id, $amount))->all();

        Bus::chain($jobs)->dispatch();

        return back()->with('success', "Queued airtime for {$ids->count()} databoy(s). Check Airtime History shortly for results.");
    }

    public function history()
    {
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

        $stats = [
            'total'       => $history->count(),
            'success'     => $history->where('status', 'success')->count(),
            'failed'      => $history->where('status', 'failed')->count(),
            'amount_sent' => $history->where('status', 'success')->sum('amount'),
        ];

        return inertia('Admin/AirtimeHistory', compact('history', 'stats'));
    }

    private function eligibleDataboysQuery()
    {
        return Databoy::whereHas('airtimeRecipient', fn ($q) => $q->where('status', 'success'))
            ->whereDoesntHave('airtimePurchases', fn ($q) => $q->where('status', '!=', 'failed'));
    }
}
