<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataboyAccreditationPayment;

class DataboyAccreditationPaymentController extends Controller
{
    public function index()
    {
        // A databoy is only ever meant to be paid once per day — but a failed
        // attempt is retryable, so repeated checkouts on a day where payment
        // keeps failing (e.g. amount not configured) can leave several rows
        // for the same databoy/day. Dedupe to one row per databoy per day:
        // prefer the successful attempt if one exists, otherwise the latest.
        $history = DataboyAccreditationPayment::with('databoy:id,full_name')
            ->orderByDesc('payment_date')
            ->orderByDesc('created_at')
            ->get(['id', 'databoy_id', 'payment_date', 'amount', 'bank_name', 'bank_code', 'account_number', 'account_name', 'status', 'message', 'created_at'])
            ->groupBy(fn ($payment) => $payment->databoy_id . '|' . $payment->payment_date->toDateString())
            ->map(fn ($group) => $group->firstWhere('status', 'success') ?? $group->first())
            ->values()
            ->map(fn ($payment) => [
                'id'             => $payment->id,
                'full_name'      => $payment->databoy->full_name ?? '—',
                'payment_date'   => $payment->payment_date->toDateString(),
                'amount'         => $payment->amount,
                'bank_name'      => $payment->bank_name,
                'account_number' => $payment->account_number,
                'account_name'   => $payment->account_name,
                'status'         => $payment->status,
                'message'        => $payment->message,
                'created_at'     => $payment->created_at,
            ]);

        $stats = [
            'total'       => $history->count(),
            'success'     => $history->where('status', 'success')->count(),
            'failed'      => $history->where('status', 'failed')->count(),
            'amount_paid' => $history->where('status', 'success')->sum('amount'),
        ];

        return inertia('Admin/DataboyAccreditationPayments', compact('history', 'stats'));
    }
}
