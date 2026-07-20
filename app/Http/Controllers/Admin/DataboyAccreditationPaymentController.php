<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataboyAccreditationPayment;

class DataboyAccreditationPaymentController extends Controller
{
    public function index()
    {
        // Unlike the applicant/party-agent payment histories, this is not
        // deduped to one row per databoy — a databoy legitimately gets one
        // successful payment per day they did accreditation work, so every
        // day's row is meaningful and shown.
        $history = DataboyAccreditationPayment::with('databoy:id,full_name')
            ->orderByDesc('payment_date')
            ->orderByDesc('created_at')
            ->get(['id', 'databoy_id', 'payment_date', 'amount', 'bank_name', 'bank_code', 'account_number', 'account_name', 'status', 'message', 'created_at'])
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
