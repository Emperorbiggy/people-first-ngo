<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Databoy;
use App\Models\DataboyApplication;
use App\Models\DataboyPayment;
use App\Models\PollingUnit;
use App\Models\Setting;
use App\Services\PaystackService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DataboyPaymentController extends Controller
{
    public function index()
    {
        $databoys = $this->eligibleDataboysQuery()
            ->with(['payments' => fn ($q) => $q->where('status', 'failed')->latest()])
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'bank_name', 'bank_code', 'account_number', 'bank_account_name'])
            ->map(fn ($db) => [
                'id'                => $db->id,
                'full_name'         => $db->full_name,
                'bank_name'         => $db->bank_name,
                'bank_code'         => $db->bank_code,
                'account_number'    => $db->account_number,
                'bank_account_name' => $db->bank_account_name,
                'previous_failure'  => optional($db->payments->first())->message,
            ]);

        return inertia('Admin/DataboyPayment', [
            'bulkTransferAmount' => Setting::get('bulk_transfer_amount', ''),
            'databoys'           => $databoys,
        ]);
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

        return inertia('Admin/PaidDataboys', compact('history', 'stats'));
    }

    public function pay(Request $request)
    {
        $request->validate([
            'databoy_ids'   => 'required|array',
            'databoy_ids.*' => 'exists:databoys,id',
        ]);

        $amount = (float) Setting::get('bulk_transfer_amount', 0);

        if ($amount <= 0) {
            return back()->withErrors(['amount' => 'Set a bulk transfer amount in Settings before paying databoys.']);
        }

        $databoys = $this->eligibleDataboysQuery()
            ->whereIn('id', $request->databoy_ids)
            ->get(['id', 'full_name', 'bank_name', 'bank_code', 'account_number', 'bank_account_name']);

        if ($databoys->isEmpty()) {
            return back()->with('error', 'No eligible databoys were selected.');
        }

        $paystack = new PaystackService();
        $paid     = 0;
        $failed   = 0;
        $chunkErrors = [];
        $firstRecipientCall = true;

        foreach ($databoys->chunk(100) as $chunk) {
            $transfers   = [];
            $referenceMap = [];

            foreach ($chunk as $databoy) {
                // Pace recipient-creation calls so we don't burst past Paystack's
                // rate limit when paying a large batch in one go.
                if (!$firstRecipientCall) {
                    usleep(200000);
                }
                $firstRecipientCall = false;

                $recipient = $paystack->createRecipient([
                    'name'           => $databoy->bank_account_name,
                    'account_number' => $databoy->account_number,
                    'bank_code'      => $databoy->bank_code,
                ]);

                if (!$recipient['status']) {
                    DataboyPayment::create([
                        'databoy_id'      => $databoy->id,
                        'amount'          => $amount,
                        'bank_name'       => $databoy->bank_name,
                        'bank_code'       => $databoy->bank_code,
                        'account_number'  => $databoy->account_number,
                        'account_name'    => $databoy->bank_account_name,
                        'recipient_code'  => null,
                        'transfer_code'   => null,
                        'reference'       => $this->generateReference($databoy),
                        'status'          => 'failed',
                        'message'         => $recipient['message'] ?? 'Failed to create transfer recipient.',
                    ]);
                    $failed++;
                    continue;
                }

                $reference = $this->generateReference($databoy);

                $transfers[] = [
                    'amount'    => (int) round($amount * 100),
                    'reference' => $reference,
                    'recipient' => $recipient['data']['recipient_code'],
                    'reason'    => 'Databoy payment',
                ];

                $referenceMap[$reference] = [
                    'databoy'        => $databoy,
                    'recipient_code' => $recipient['data']['recipient_code'],
                ];
            }

            if (empty($transfers)) {
                continue;
            }

            $bulkResult = $paystack->initiateBulkTransfer($transfers);

            if (!$bulkResult['status']) {
                $chunkErrors[] = $bulkResult['message'] ?? 'Bulk transfer failed for a batch.';
                continue;
            }

            foreach ($bulkResult['data'] as $item) {
                $entry = $referenceMap[$item['reference']] ?? null;

                if (!$entry) {
                    continue;
                }

                $databoy = $entry['databoy'];

                // Paystack queues bulk transfers asynchronously and reports them as
                // "pending" at initiation time; with OTP disabled there's no manual
                // confirmation step left, so we treat "pending" as a completed payment.
                $status = $item['status'] ?? 'pending';
                if ($status === 'pending') {
                    $status = 'success';
                }

                DataboyPayment::create([
                    'databoy_id'      => $databoy->id,
                    'amount'          => $amount,
                    'bank_name'       => $databoy->bank_name,
                    'bank_code'       => $databoy->bank_code,
                    'account_number'  => $databoy->account_number,
                    'account_name'    => $databoy->bank_account_name,
                    'recipient_code'  => $entry['recipient_code'],
                    'transfer_code'   => $item['transfer_code'] ?? null,
                    'reference'       => $item['reference'],
                    'status'          => $status,
                    'message'         => $item['reason'] ?? null,
                ]);

                $status === 'failed' ? $failed++ : $paid++;
            }
        }

        $message = "{$paid} payment(s) initiated" . ($failed > 0 ? ", {$failed} failed" : '') . '.';

        if (!empty($chunkErrors)) {
            return back()->with([
                'success' => $message,
                'error'   => implode(' ', $chunkErrors),
            ]);
        }

        return back()->with('success', $message);
    }

    private function paymentHistory()
    {
        return DataboyPayment::with('databoy:id,full_name')
            ->latest()
            ->get(['id', 'databoy_id', 'amount', 'bank_name', 'bank_code', 'account_number', 'account_name', 'status', 'message', 'created_at'])
            ->map(fn ($payment) => [
                'id'             => $payment->id,
                'full_name'      => $payment->databoy->full_name ?? '—',
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

    private function eligibleDataboysQuery()
    {
        return Databoy::whereNotNull('bank_code')
            ->where('bank_code', '!=', '')
            ->whereNotNull('account_number')
            ->where('account_number', '!=', '')
            // A databoy with a non-failed (i.e. successful) payment has already been
            // paid and must never be paid again. One whose only attempts failed is
            // still eligible so it can be retried.
            ->whereDoesntHave('payments', fn ($q) => $q->where('status', '!=', 'failed'))
            ->whereIn('id', $this->fullyRegisteredDataboyIds());
    }

    /**
     * Databoys who have registered at least 2 applicants in every polling unit
     * of their assigned ward — mirrors DataboyAnalyticsController's completion logic.
     */
    private function fullyRegisteredDataboyIds(): array
    {
        $wardPuCounts = PollingUnit::select('ward_id', DB::raw('count(*) as total'))
            ->groupBy('ward_id')
            ->pluck('total', 'ward_id');

        $appGroups = DataboyApplication::select('registered_by', 'polling_unit_id', DB::raw('count(*) as cnt'))
            ->groupBy('registered_by', 'polling_unit_id')
            ->get()
            ->groupBy('registered_by');

        return Databoy::whereNotNull('ward_id')
            ->get(['id', 'ward_id'])
            ->filter(function ($db) use ($wardPuCounts, $appGroups) {
                $totalPUs = $wardPuCounts[$db->ward_id] ?? 0;

                if ($totalPUs === 0) {
                    return false;
                }

                $myApps       = $appGroups->get($db->id, collect());
                $completedPUs = $myApps->filter(fn ($r) => $r->cnt >= 2)->count();

                return $completedPUs === $totalPUs;
            })
            ->pluck('id')
            ->all();
    }

    private function generateReference(Databoy $databoy): string
    {
        return 'databoy-' . $databoy->id . '-' . now()->timestamp . '-' . Str::random(6);
    }
}
