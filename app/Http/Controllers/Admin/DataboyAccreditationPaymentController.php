<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\PayDataboyAccreditationJob;
use App\Models\Databoy;
use App\Models\DataboyAccreditationPayment;
use App\Models\DataboyApplication;
use App\Models\Setting;
use Illuminate\Http\Request;

class DataboyAccreditationPaymentController extends Controller
{
    public function index()
    {
        // A databoy is only ever meant to be paid once, period — but a failed
        // attempt is retryable, so repeated retries can leave several rows for
        // the same databoy. Dedupe to one row per databoy: prefer the
        // successful attempt if one exists, otherwise the latest attempt.
        $history = DataboyAccreditationPayment::with('databoy:id,full_name')
            ->orderByDesc('payment_date')
            ->orderByDesc('created_at')
            ->get(['id', 'databoy_id', 'payment_date', 'amount', 'bank_name', 'bank_code', 'account_number', 'account_name', 'status', 'message', 'created_at'])
            ->groupBy('databoy_id')
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

    public function pending()
    {
        $ids = $this->eligibleDataboyIds();

        $databoys = Databoy::whereIn('id', $ids)
            ->with(['accreditationPayments' => fn ($q) => $q->where('status', 'failed')->latest()])
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'bank_name', 'account_number', 'bank_account_name'])
            ->map(fn ($databoy) => [
                'id'                => $databoy->id,
                'full_name'         => $databoy->full_name,
                'bank_name'         => $databoy->bank_name,
                'account_number'    => $databoy->account_number,
                'bank_account_name' => $databoy->bank_account_name,
                'previous_failure'  => optional($databoy->accreditationPayments->first())->message,
            ]);

        return inertia('Admin/DataboyAccreditationPending', [
            'accreditationDataboyAmount' => Setting::get('accreditation_databoy_amount', ''),
            'databoys'                   => $databoys,
        ]);
    }

    public function pay(Request $request)
    {
        $request->validate([
            'databoy_ids'   => 'required|array',
            'databoy_ids.*' => 'exists:databoys,id',
        ]);

        $amount = (float) Setting::get('accreditation_databoy_amount', 0);

        if ($amount <= 0) {
            return back()->withErrors(['amount' => 'Set the Databoy Payment amount in Settings before paying.']);
        }

        $ids = $this->eligibleDataboyIds()->intersect($request->databoy_ids);

        if ($ids->isEmpty()) {
            return back()->with('error', 'No eligible databoys were selected — they may have already been paid.');
        }

        foreach ($ids as $id) {
            PayDataboyAccreditationJob::dispatch($id);
        }

        return back()->with('success', "Queued payment for {$ids->count()} databoy(s).");
    }

    /**
     * Databoys who have accredited (checked someone out) at least once but
     * don't yet have a non-failed accreditation payment — a databoy is paid
     * once, ever, so anyone already paid drops out of this list permanently,
     * even if they go on to accredit more people on later days.
     */
    private function eligibleDataboyIds()
    {
        $worked = DataboyApplication::whereNotNull('checked_out_at')
            ->whereNotNull('accredited_by_databoy_id')
            ->distinct()
            ->pluck('accredited_by_databoy_id');

        $alreadyPaid = DataboyAccreditationPayment::where('status', '!=', 'failed')
            ->distinct()
            ->pluck('databoy_id');

        return $worked->diff($alreadyPaid);
    }
}
