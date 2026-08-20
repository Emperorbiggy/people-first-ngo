<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\CreateApoFinalRecipientJob;
use App\Jobs\PayApoFinalPaymentJob;
use App\Models\ApoFinalPayment;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * APO/PO final payment — its own list, separate from every other payment pool.
 *
 * Import bank details and amounts, create the transfer recipients, then pay.
 * Each row carries its own amount; nothing is queued on upload, so a sheet can
 * be checked before anything reaches Paystack.
 */
class ApoFinalPaymentController extends Controller
{
    /** What recipients see on their statement unless it is changed on the page. */
    public const DEFAULT_NARRATION = 'OSSG SECURITY PACKAGE';

    private const HEADER_ALIASES = [
        // bank_code before bank_name so "Bank Code" is never eaten by "Bank".
        'bank_code'      => ['bankcode'],
        'bank_name'      => ['bankname', 'bank'],
        'account_number' => ['accountnumber', 'acctnumber', 'accountno', 'acctno', 'nuban'],
        'account_name'   => ['accountname', 'acctname', 'name'],
        'amount'         => ['amount', 'amt', 'value'],
    ];

    public function index(Request $request)
    {
        $search = trim((string) $request->query('q', ''));
        $filter = $request->query('filter', 'all');

        $query = ApoFinalPayment::query()
            ->when($filter === 'ready', fn ($q) => $q->whereNotNull('recipient_code')->where('recipient_code', '!=', ''))
            ->when($filter === 'no_recipient', fn ($q) => $q->needsRecipient())
            ->when($filter === 'paid', fn ($q) => $q->whereNotNull('paid_key'))
            ->when($filter === 'unpaid', fn ($q) => $q->whereNull('paid_key'))
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('account_name', 'like', "%{$search}%")
                ->orWhere('account_number', 'like', "%{$search}%")
                ->orWhere('bank_name', 'like', "%{$search}%")));

        $rows = (clone $query)->orderBy('account_name')->paginate(100)->withQueryString();

        $payable = ApoFinalPayment::payable();

        return inertia('Admin/ApoFinalPayments', [
            'rows'      => $rows,
            'filters'   => ['q' => $search, 'filter' => $filter],
            'narration' => self::DEFAULT_NARRATION,
            'stats'     => [
                'total'          => ApoFinalPayment::count(),
                'missing_code'   => ApoFinalPayment::missingBankCode()->count(),
                'with_recipient' => ApoFinalPayment::whereNotNull('recipient_code')->where('recipient_code', '!=', '')->count(),
                'paid'           => ApoFinalPayment::whereNotNull('paid_key')->count(),
                'payable'        => (clone $payable)->count(),
                'payable_total'  => (float) (clone $payable)->sum('amount'),
                'total_amount'   => (float) ApoFinalPayment::sum('amount'),
                'paid_amount'    => (float) ApoFinalPayment::where('payment_status', 'success')->sum('amount'),
                'unsettled'      => ApoFinalPayment::whereNotNull('paid_key')->whereIn('payment_status', ['pending', 'unknown'])->count(),
            ],
        ]);
    }

    // ── 1. Import ───────────────────────────────────────────────────────────

    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file|max:20480']);

        try {
            $parsed = $this->parse($request->file('file'));
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => 'Could not read that file: ' . $e->getMessage()]);
        }

        if (empty($parsed)) {
            return back()->withErrors(['file' => 'No usable rows found. Bank Name, Account Number and Amount are needed.']);
        }

        $created = 0;
        $updated = 0;
        $skipped = [];
        $seen    = [];

        foreach ($parsed as $row) {
            $reason = match (true) {
                $row['bank_name'] === ''        => 'No bank name',
                $row['account_number'] === null => 'No account number',
                !$row['amount']                 => 'No amount',
                isset($seen[$row['account_number']]) => 'Duplicate account — already on line ' . $seen[$row['account_number']],
                default => null,
            };

            if ($reason) {
                $skipped[] = "line {$row['_line']}: {$reason}";
                continue;
            }

            $seen[$row['account_number']] = $row['_line'];
            unset($row['_line']);

            // An account already on the list is corrected, not duplicated —
            // but never once it has been paid, since that record is history.
            $existing = ApoFinalPayment::where('account_number', $row['account_number'])->first();

            if ($existing) {
                if ($existing->paid_key !== null) {
                    $skipped[] = "{$existing->account_number}: already paid, left untouched";
                    continue;
                }

                $existing->update(array_filter($row, fn ($v) => $v !== null && $v !== ''));
                $updated++;
                continue;
            }

            ApoFinalPayment::create($row);
            $created++;
        }

        $message = "Imported {$created} row(s)" . ($updated ? ", updated {$updated} existing" : '') . '.';

        if ($skipped) {
            $message .= ' ' . count($skipped) . ' skipped — ' . implode('; ', array_slice($skipped, 0, 5))
                . (count($skipped) > 5 ? ' and ' . (count($skipped) - 5) . ' more' : '') . '.';
        }

        $message .= ' Next: create recipients.';

        return back()->with('success', $message);
    }

    // ── 2. Create recipients ────────────────────────────────────────────────

    public function generateRecipients()
    {
        $rows = ApoFinalPayment::needsRecipient()->get();

        if ($rows->isEmpty()) {
            return back()->with('success', 'Every row already has a transfer recipient.');
        }

        // Queued individually, not chained: a broken chain would leave most of
        // the sheet with no recipient. Each job paces itself before calling
        // Paystack, and a single worker runs them one at a time.
        $rows->each(fn ($row) => CreateApoFinalRecipientJob::dispatch($row->id));

        return back()->with('success', "Queued recipient creation for {$rows->count()} row(s). Refresh shortly to see results.");
    }

    // ── 3. Pay ──────────────────────────────────────────────────────────────

    public function send(Request $request)
    {
        $validated = $request->validate([
            'narration' => 'required|string|max:100',
            'ids'       => 'nullable|array',
            'ids.*'     => 'integer',
            'all'       => 'nullable|boolean',
        ]);

        $query = $request->boolean('all')
            ? ApoFinalPayment::payable()
            : ApoFinalPayment::payable()->whereIn('id', $validated['ids'] ?? []);

        $count = (clone $query)->count();

        if ($count === 0) {
            $noRecipient = ApoFinalPayment::needsRecipient()->count();

            return back()->with('error', $noRecipient > 0
                ? "Nothing is payable — {$noRecipient} row(s) have no transfer recipient. Create recipients first."
                : 'Nothing is payable — every row with a recipient has already been paid.');
        }

        $total = (clone $query)->sum('amount');

        // Chunked so a large sheet never holds every row in memory at once.
        $query->chunkById(500, function ($rows) use ($validated) {
            foreach ($rows as $row) {
                PayApoFinalPaymentJob::dispatch($row->id, $validated['narration']);
            }
        });

        return back()->with('success', "Queued {$count} transfer(s) totalling ₦" . number_format($total, 2) . '.');
    }

    public function pay(Request $request, ApoFinalPayment $apoFinalPayment)
    {
        $validated = $request->validate(['narration' => 'required|string|max:100']);

        if ($apoFinalPayment->paid_key !== null) {
            return back()->with('error', 'That row already has a payment on record.');
        }

        if (!$apoFinalPayment->recipient_code) {
            return back()->with('error', 'That row has no transfer recipient yet.');
        }

        PayApoFinalPaymentJob::dispatch($apoFinalPayment->id, $validated['narration']);

        return back()->with('success', 'Queued ₦' . number_format($apoFinalPayment->amount, 2) . " for {$apoFinalPayment->account_name}.");
    }

    /** Ask Paystack for the real outcome of anything still settling. */
    public function refreshStatuses(\App\Services\PaystackService $paystack)
    {
        $rows = ApoFinalPayment::whereNotNull('paid_key')
            ->whereIn('payment_status', ['pending', 'unknown'])
            ->get();

        if ($rows->isEmpty()) {
            return back()->with('success', 'No payments are awaiting confirmation.');
        }

        $settled = 0;
        $failed  = 0;
        $still   = 0;

        foreach ($rows as $row) {
            $result = $row->transfer_code
                ? $paystack->fetchTransfer($row->transfer_code)
                : $paystack->verifyTransferByReference($row->reference);

            if (!($result['status'] ?? false)) {
                $still++;
                continue;
            }

            $status = match (strtolower((string) ($result['data']['status'] ?? ''))) {
                'success' => 'success',
                'failed', 'abandoned', 'reversed' => 'failed',
                'pending', 'otp', 'processing', 'queued' => 'pending',
                default   => 'unknown',
            };

            $row->update([
                'payment_status'  => $status,
                'payment_message' => $result['data']['reason'] ?? $row->payment_message,
                // A confirmed failure frees the row for a genuine retry.
                'paid_key'        => $status === 'failed' ? null : $row->paid_key,
            ]);

            $status === 'success' ? $settled++ : ($status === 'failed' ? $failed++ : $still++);
        }

        return back()->with('success', "Checked {$rows->count()}: {$settled} confirmed paid, {$failed} failed, {$still} still pending.");
    }

    public function destroy(ApoFinalPayment $apoFinalPayment)
    {
        if ($apoFinalPayment->paid_key !== null) {
            return back()->with('error', 'That row has a payment on record and cannot be deleted.');
        }

        $apoFinalPayment->delete();

        return back()->with('success', 'Row removed.');
    }

    public function export()
    {
        $csv = "Bank Name,Bank Code,Account Number,Account Name,Amount,Recipient Status,Payment Status,Reference,Paid At\n";

        ApoFinalPayment::orderBy('account_name')->chunk(500, function ($rows) use (&$csv) {
            foreach ($rows as $r) {
                $csv .= implode(',', array_map(
                    // Quote everything: an unquoted account number loses its
                    // leading zero in Excel.
                    fn ($v) => '"' . str_replace('"', '""', (string) $v) . '"',
                    [
                        $r->bank_name, $r->bank_code, $r->account_number, $r->account_name, $r->amount,
                        $r->recipient_status ?? 'none', $r->payment_status ?? 'not paid',
                        $r->reference, optional($r->paid_at)->format('Y-m-d H:i'),
                    ]
                )) . "\n";
            }
        });

        return response($csv, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="apo-final-payments-' . now()->format('Ymd-Hi') . '.csv"',
        ]);
    }

    /**
     * @return array<int, array<string, string|float|null>>
     */
    private function parse(UploadedFile $file): array
    {
        $sheet = IOFactory::load($file->getRealPath())->getActiveSheet()->toArray(null, true, false, false);

        if (empty($sheet)) {
            return [];
        }

        $map       = [];
        $normalise = fn ($v) => preg_replace('/[^a-z]/', '', strtolower((string) $v));

        foreach ($sheet[0] ?? [] as $index => $heading) {
            $h = $normalise($heading);

            if ($h === '') {
                continue;
            }

            foreach (self::HEADER_ALIASES as $field => $aliases) {
                if (isset($map[$field])) {
                    continue;
                }

                foreach ($aliases as $alias) {
                    $needle = $normalise($alias);

                    if ($h === $needle || (strlen($needle) >= 6 && str_contains($h, $needle))) {
                        $map[$field] = $index;
                        break 2;
                    }
                }
            }
        }

        if (!isset($map['account_number'])) {
            throw new \RuntimeException('the sheet needs an Account Number column.');
        }

        $rows = [];

        foreach (array_slice($sheet, 1) as $index => $line) {
            $cell = fn (?int $i) => $i === null ? '' : trim((string) ($line[$i] ?? ''));

            $account = $this->accountNumber($cell($map['account_number'] ?? null));
            $bank    = $cell($map['bank_name'] ?? null);

            // A wholly empty line is spreadsheet padding, not a rejected row.
            if ($account === null && $bank === '') {
                continue;
            }

            $rows[] = [
                // +2: one for the header, one because the sheet is 1-indexed.
                '_line'          => $index + 2,
                'bank_name'      => $bank,
                'bank_code'      => $cell($map['bank_code'] ?? null) ?: null,
                'account_number' => $account,
                'account_name'   => $cell($map['account_name'] ?? null) ?: null,
                'amount'         => $this->money($cell($map['amount'] ?? null)),
            ];
        }

        return $rows;
    }

    /** "₦12,500.00" and "12500" both mean the same thing. */
    private function money(string $value): ?float
    {
        $clean = preg_replace('/[^0-9.]/', '', $value);

        return $clean === '' ? null : (float) $clean;
    }

    /** Excel strips leading zeros from account numbers; put them back. */
    private function accountNumber(string $value): ?string
    {
        $digits = preg_replace('/\D/', '', $value);

        if ($digits === '') {
            return null;
        }

        return strlen($digits) < 10 ? str_pad($digits, 10, '0', STR_PAD_LEFT) : $digits;
    }
}
