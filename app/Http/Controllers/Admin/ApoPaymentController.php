<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\PayApoOfficerJob;
use App\Models\ApoOfficer;
use App\Models\ApoPayment;
use Illuminate\Http\Request;

/**
 * APO payment history and retries.
 *
 * Retrying here is safe by construction: PayApoOfficerJob must win a unique
 * database claim before it can transfer, so a retry of an officer who is
 * already paid (or is being paid right now by another job) stops at the
 * insert. The filtering below is a courtesy to avoid pointless jobs, not the
 * thing keeping anyone from being paid twice.
 */
class ApoPaymentController extends Controller
{
    public function index()
    {
        $history = ApoPayment::with([
                'application:id,full_name,lga_id',
                'application.lga:id,name',
            ])
            ->latest()
            ->get()
            // An officer can have failed attempts followed by a live one; only
            // the newest row reflects where they actually stand.
            ->groupBy('apo_officer_id')
            ->map(fn ($attempts) => $attempts->first())
            ->values()
            ->map(fn ($payment) => [
                'id'             => $payment->id,
                'apo_officer_id' => $payment->apo_officer_id,
                'full_name'      => $payment->application->full_name ?? '—',
                'lga'            => $payment->application->lga->name ?? '—',
                'amount'         => $payment->amount,
                'bank_name'      => $payment->bank_name,
                'account_number' => $payment->account_number,
                'account_name'   => $payment->account_name,
                'status'         => $payment->status,
                'message'        => $payment->message,
                'created_at'     => $payment->created_at,
            ]);

        $accredited = ApoOfficer::where('is_accredited', true)->count();

        return inertia('Admin/ApoPayments', [
            'history' => $history,
            'stats'   => [
                'accredited'  => $accredited,
                'paid'        => $history->where('status', 'success')->count(),
                'pending'     => $history->where('status', 'pending')->count(),
                'unknown'     => $history->where('status', 'unknown')->count(),
                'failed'      => $history->where('status', 'failed')->count(),
                'unpaid'      => max(0, $accredited - ApoPayment::whereNotNull('paid_key')->count()),
                'amount_paid' => $history->where('status', 'success')->sum('amount'),
            ],
        ]);
    }

    public function retry(ApoOfficer $apoOfficer)
    {
        $name = $apoOfficer->application->full_name ?? 'This officer';

        if (!$apoOfficer->is_accredited) {
            return back()->with('error', "{$name} is not APO-accredited — nothing to pay.");
        }

        if ($apoOfficer->hasLivePayment()) {
            return back()->with('error', "{$name} already has a payment on record. Retry is only for failed attempts.");
        }

        PayApoOfficerJob::dispatch($apoOfficer->id);

        return back()->with('success', "Retrying APO payment for {$name}.");
    }

    public function payUnpaid(Request $request)
    {
        $officers = ApoOfficer::where('is_accredited', true)
            ->whereDoesntHave('payments', fn ($q) => $q->whereNotNull('paid_key'))
            ->get();

        if ($officers->isEmpty()) {
            return back()->with('error', 'Every accredited APO officer already has a payment on record.');
        }

        foreach ($officers as $officer) {
            PayApoOfficerJob::dispatch($officer->id);
        }

        return back()->with('success', "Queued payment for {$officers->count()} APO officer(s).");
    }
}
