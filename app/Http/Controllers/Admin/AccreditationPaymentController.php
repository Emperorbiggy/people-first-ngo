<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccreditationPayment;

class AccreditationPaymentController extends Controller
{
    public function index()
    {
        $history = $this->paymentHistory();

        $stats = [
            'total'       => $history->count(),
            'success'     => $history->where('status', 'success')->count(),
            'pending'     => $history->whereIn('status', ['pending', 'otp'])->count(),
            'failed'      => $history->where('status', 'failed')->count(),
            'amount_paid' => $history->where('status', 'success')->sum('amount'),
        ];

        return inertia('Admin/AccreditationPayments', compact('history', 'stats'));
    }

    private function paymentHistory()
    {
        return AccreditationPayment::with([
                'application:id,full_name,lga_id,registered_by',
                'application.lga:id,name',
                'application.databoy:id,full_name',
            ])
            ->latest()
            ->get(['id', 'databoy_application_id', 'amount', 'bank_name', 'bank_code', 'account_number', 'account_name', 'status', 'message', 'created_at'])
            // An applicant can have multiple attempts (e.g. an earlier failed one
            // followed by a later success) — only the most recent attempt per
            // applicant reflects their current, true payment status.
            ->groupBy('databoy_application_id')
            ->map(fn ($attempts) => $attempts->first())
            ->values()
            ->map(fn ($payment) => [
                'id'             => $payment->id,
                'full_name'      => $payment->application->full_name ?? '—',
                'lga'            => $payment->application->lga->name ?? '—',
                'databoy'        => $payment->application->databoy->full_name ?? '—',
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
}
