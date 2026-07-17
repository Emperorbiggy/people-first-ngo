<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SendApplicantPaymentBatchJob;
use App\Models\ApplicantPayment;
use App\Models\DataboyApplication;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;

class ApplicantPaymentController extends Controller
{
    public function index()
    {
        $applications = $this->eligibleApplicationsQuery()
            ->with(['payments' => fn ($q) => $q->where('status', 'failed')->latest()])
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'bank_name', 'account_number', 'bank_account_name'])
            ->map(fn ($app) => [
                'id'                => $app->id,
                'full_name'         => $app->full_name,
                'bank_name'         => $app->bank_name,
                'account_number'    => $app->account_number,
                'bank_account_name' => $app->bank_account_name,
                'previous_failure'  => optional($app->payments->first())->message,
            ]);

        return inertia('Admin/ApplicantPayment', [
            'applicantTransferAmount' => Setting::get('applicant_transfer_amount', ''),
            'applications'            => $applications,
        ]);
    }

    public function pay(Request $request)
    {
        $request->validate([
            'application_ids'   => 'required|array',
            'application_ids.*' => 'exists:databoy_applications,id',
        ]);

        $amount = (float) Setting::get('applicant_transfer_amount', 0);

        if ($amount <= 0) {
            return back()->withErrors(['amount' => 'Set an applicant transfer amount in Settings before paying applicants.']);
        }

        $ids = $this->eligibleApplicationsQuery()
            ->whereIn('id', $request->application_ids)
            ->pluck('id');

        if ($ids->isEmpty()) {
            return back()->with('error', 'No eligible applicants were selected.');
        }

        // Paystack allows up to 100 transfers per bulk-transfer call. Chain the
        // batches so the queue worker only starts the next 100 once the
        // previous batch's Paystack call has completed.
        $jobs = $ids->chunk(100)
            ->map(fn ($chunk) => new SendApplicantPaymentBatchJob($chunk->values()->all(), $amount))
            ->all();

        Bus::chain($jobs)->dispatch();

        return back()->with('success', "Queued payment for {$ids->count()} applicant(s) in " . count($jobs) . ' batch(es). Check the Paid Applicants page shortly for results.');
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

        return inertia('Admin/PaidApplicants', compact('history', 'stats'));
    }

    private function paymentHistory()
    {
        return ApplicantPayment::with('application:id,full_name')
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

    private function eligibleApplicationsQuery()
    {
        return DataboyApplication::whereHas('recipient', fn ($q) => $q->where('status', 'success'))
            // An applicant with a non-failed (i.e. successful) payment has already
            // been paid and must never be paid again. One whose only attempts
            // failed is still eligible so it can be retried.
            ->whereDoesntHave('payments', fn ($q) => $q->where('status', '!=', 'failed'));
    }
}
