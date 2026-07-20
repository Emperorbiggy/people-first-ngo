<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SendPartyAgentPaymentBatchJob;
use App\Models\PartyAgent;
use App\Models\PartyAgentPayment;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;

class PartyAgentPaymentController extends Controller
{
    public function index()
    {
        $partyAgents = $this->eligiblePartyAgentsQuery()
            ->with(['payments' => fn ($q) => $q->where('status', 'failed')->latest()])
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'bank_name', 'account_number', 'bank_account_name'])
            ->map(fn ($agent) => [
                'id'                => $agent->id,
                'full_name'         => $agent->full_name,
                'bank_name'         => $agent->bank_name,
                'account_number'    => $agent->account_number,
                'bank_account_name' => $agent->bank_account_name,
                'previous_failure'  => optional($agent->payments->first())->message,
            ]);

        return inertia('Admin/PartyAgentPayment', [
            'partyAgentPaymentAmount' => Setting::get('party_agent_payment_amount', ''),
            'partyAgents'             => $partyAgents,
        ]);
    }

    public function pay(Request $request)
    {
        $request->validate([
            'party_agent_ids'   => 'required|array',
            'party_agent_ids.*' => 'exists:party_agents,id',
        ]);

        $amount = (float) Setting::get('party_agent_payment_amount', 0);

        if ($amount <= 0) {
            return back()->withErrors(['amount' => 'Set a party agent payment amount in Settings before paying party agents.']);
        }

        $ids = $this->eligiblePartyAgentsQuery()
            ->whereIn('id', $request->party_agent_ids)
            ->pluck('id');

        if ($ids->isEmpty()) {
            return back()->with('error', 'No eligible party agents were selected.');
        }

        // Paystack allows up to 100 transfers per bulk-transfer call. Chain the
        // batches so the queue worker only starts the next 100 once the
        // previous batch's Paystack call has completed.
        $jobs = $ids->chunk(100)
            ->map(fn ($chunk) => new SendPartyAgentPaymentBatchJob($chunk->values()->all(), $amount))
            ->all();

        Bus::chain($jobs)->dispatch();

        return back()->with('success', "Queued payment for {$ids->count()} party agent(s) in " . count($jobs) . ' batch(es). Check the Paid Party Agents page shortly for results.');
    }

    public function paid()
    {
        $history = $this->paymentHistory();

        $stats = [
            'total'       => $history->count(),
            'success'     => $history->where('status', 'success')->count(),
            'pending'     => $history->whereIn('status', ['pending', 'otp'])->count(),
            'failed'      => $history->where('status', 'failed')->count(),
            'amount_paid' => $history->where('status', 'success')->sum('amount'),
        ];

        return inertia('Admin/PaidPartyAgents', compact('history', 'stats'));
    }

    private function paymentHistory()
    {
        return PartyAgentPayment::with('partyAgent:id,full_name')
            ->latest()
            ->get(['id', 'party_agent_id', 'amount', 'bank_name', 'bank_code', 'account_number', 'account_name', 'status', 'message', 'created_at'])
            // A party agent can have multiple attempts (e.g. an earlier failed one
            // followed by a later success) — only the most recent attempt per
            // party agent reflects their current, true payment status.
            ->groupBy('party_agent_id')
            ->map(fn ($attempts) => $attempts->first())
            ->values()
            ->map(fn ($payment) => [
                'id'             => $payment->id,
                'full_name'      => $payment->partyAgent->full_name ?? '—',
                'amount'         => $payment->amount,
                'bank_name'      => $payment->bank_name,
                'bank_code'      => $payment->bank_code,
                'account_number' => $payment->account_number,
                'account_name'   => $payment->account_name,
                'status'         => $payment->status,
                'message'        => $payment->message,
                'created_at'     => $payment->created_at,
            ]);
    }

    private function eligiblePartyAgentsQuery()
    {
        return PartyAgent::whereHas('recipient', fn ($q) => $q->where('status', 'success'))
            // A party agent with a non-failed (i.e. successful) payment has already
            // been paid and must never be paid again. One whose only attempts
            // failed is still eligible so it can be retried.
            ->whereDoesntHave('payments', fn ($q) => $q->where('status', '!=', 'failed'));
    }
}
