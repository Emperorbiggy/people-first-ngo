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

    public function pending()
    {
        $pending = $this->pendingWorkDates();

        $databoys = Databoy::whereIn('id', $pending->pluck('databoy_id')->unique())
            ->get(['id', 'full_name', 'bank_name', 'account_number', 'bank_account_name'])
            ->keyBy('id');

        $failureMessages = DataboyAccreditationPayment::whereIn('databoy_id', $databoys->keys())
            ->where('status', 'failed')
            ->orderByDesc('created_at')
            ->get(['databoy_id', 'payment_date', 'message'])
            ->groupBy(fn ($p) => $p->databoy_id . '|' . $p->payment_date->toDateString())
            ->map(fn ($group) => $group->first()->message);

        $items = $pending->map(function ($row) use ($databoys, $failureMessages) {
            $databoy = $databoys->get($row->databoy_id);
            $key     = $row->databoy_id . '|' . $row->work_date;

            return [
                'databoy_id'        => $row->databoy_id,
                'work_date'         => $row->work_date,
                'full_name'         => $databoy->full_name ?? '—',
                'bank_name'         => $databoy->bank_name ?? null,
                'account_number'    => $databoy->account_number ?? null,
                'bank_account_name' => $databoy->bank_account_name ?? null,
                'previous_failure'  => $failureMessages->get($key),
            ];
        })->sortBy('work_date')->values();

        return inertia('Admin/DataboyAccreditationPending', [
            'accreditationDataboyAmount' => Setting::get('accreditation_databoy_amount', ''),
            'items'                      => $items,
        ]);
    }

    public function pay(Request $request)
    {
        $request->validate([
            'items'             => 'required|array',
            'items.*.databoy_id' => 'required|integer|exists:databoys,id',
            'items.*.work_date'  => 'required|date',
        ]);

        $amount = (float) Setting::get('accreditation_databoy_amount', 0);

        if ($amount <= 0) {
            return back()->withErrors(['amount' => 'Set the Databoy Payment amount in Settings before paying.']);
        }

        $eligible = $this->pendingWorkDates()
            ->map(fn ($row) => $row->databoy_id . '|' . $row->work_date)
            ->flip();

        $queued = 0;

        foreach ($request->items as $item) {
            $key = $item['databoy_id'] . '|' . $item['work_date'];

            if (!isset($eligible[$key])) {
                continue;
            }

            PayDataboyAccreditationJob::dispatch((int) $item['databoy_id'], $item['work_date']);
            $queued++;
        }

        if ($queued === 0) {
            return back()->with('error', 'No eligible databoy/day records were selected — they may have already been paid.');
        }

        return back()->with('success', "Queued payment for {$queued} databoy/day record(s).");
    }

    /**
     * Every (databoy, work day) pair where the databoy accredited someone
     * (checked someone out) that day but doesn't yet have a non-failed
     * accreditation payment recorded for that specific day — covers today
     * as well as any earlier unpaid day.
     */
    private function pendingWorkDates()
    {
        $worked = DataboyApplication::whereNotNull('checked_out_at')
            ->whereNotNull('accredited_by_databoy_id')
            ->selectRaw('accredited_by_databoy_id as databoy_id, DATE(checked_out_at) as work_date')
            ->distinct()
            ->get();

        $paidPairs = DataboyAccreditationPayment::where('status', '!=', 'failed')
            ->get(['databoy_id', 'payment_date'])
            ->map(fn ($p) => $p->databoy_id . '|' . $p->payment_date->toDateString())
            ->flip();

        return $worked->reject(
            fn ($row) => isset($paidPairs[$row->databoy_id . '|' . $row->work_date])
        )->values();
    }
}
