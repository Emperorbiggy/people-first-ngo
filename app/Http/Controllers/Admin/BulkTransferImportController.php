<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\CreateBulkTransferRecipientJob;
use App\Jobs\PayBulkTransferRecipientJob;
use App\Models\BulkTransferBatch;
use App\Models\BulkTransferPayment;
use App\Models\BulkTransferRecipient;
use App\Services\PaystackService;
use App\Support\BankMatcher;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Bulk transfers, one batch at a time.
 *
 * Each import becomes a named batch with its own identifier, and the four steps
 * are run deliberately against that batch: import → match bank codes → create
 * recipients → send. Nothing happens automatically on upload, so a sheet can be
 * checked before any of it reaches Paystack.
 *
 * The amount lives on each row, not on the send action: everyone in a sheet can
 * be owed a different sum.
 */
class BulkTransferImportController extends Controller
{
    private const HEADER_ALIASES = [
        'full_name'       => ['fullname', 'name', 'beneficiary', 'beneficiaryname'],
        'gender'          => ['gendersex', 'gender', 'sex'],
        // bank_code before bank_name so "Bank Code" is never eaten by "Bank".
        'bank_code'       => ['bankcode'],
        'bank_name'       => ['bankname', 'bank'],
        'account_number'  => ['accountnumber', 'acctnumber', 'accountno', 'acctno', 'nuban'],
        'account_name'    => ['accountname', 'acctname'],
        'duty_post'       => ['dutypost', 'duty', 'post'],
        'source_identity' => ['sourceidentity', 'source', 'identity'],
        'amount'          => ['amount', 'amt', 'sum', 'value'],
        'remark'          => ['remark', 'remarks', 'note', 'notes', 'comment'],
    ];

    public function index(Request $request)
    {
        $batches = BulkTransferBatch::withCount([
                'recipients',
                'recipients as with_recipient_count' => fn ($q) => $q->whereNotNull('recipient_code')->where('recipient_code', '!=', ''),
                'recipients as missing_code_count'   => fn ($q) => $q->missingBankCode(),
                'recipients as paid_count'           => fn ($q) => $q->whereHas('payments', fn ($p) => $p->whereNotNull('paid_key')),
            ])
            ->latest()
            ->get()
            ->map(fn ($batch) => [
                'id'             => $batch->id,
                'reference'      => $batch->reference,
                'name'           => $batch->name,
                'file_name'      => $batch->file_name,
                'created_at'     => $batch->created_at,
                'rows_read'      => $batch->rows_read,
                'skipped_count'  => $batch->skipped_count,
                // Enough to see the pattern in the page; the full list is a
                // download, since a big sheet can reject hundreds of rows.
                'skipped_sample' => collect($batch->skipped_rows ?? [])->take(25)->values(),
                'skipped_reasons' => collect($batch->skipped_rows ?? [])
                    ->countBy(fn ($s) => str_starts_with($s['reason'], 'Duplicate') ? 'Duplicate account' : $s['reason'])
                    ->map(fn ($count, $reason) => ['reason' => $reason, 'count' => $count])
                    ->values(),
                'total'          => $batch->recipients_count,
                'with_recipient' => $batch->with_recipient_count,
                'missing_code'   => $batch->missing_code_count,
                'paid'           => $batch->paid_count,
                'unpaid'         => $batch->recipients_count - $batch->paid_count,
                'total_amount'   => (float) BulkTransferRecipient::where('batch_id', $batch->id)->sum('amount'),
                'paid_amount'    => (float) BulkTransferPayment::whereIn(
                        'bulk_transfer_recipient_id',
                        BulkTransferRecipient::where('batch_id', $batch->id)->select('id')
                    )->where('status', 'success')->sum('amount'),
            ]);

        // Default to the newest batch so the page opens on something useful.
        $selectedId = $request->query('batch') ?: $batches->first()['id'] ?? null;

        $rows = $selectedId
            ? BulkTransferRecipient::where('batch_id', $selectedId)
                ->withCount(['payments as live_payments_count' => fn ($q) => $q->whereNotNull('paid_key')])
                ->with(['payments' => fn ($q) => $q->latest()->limit(1)])
                ->orderBy('full_name')
                ->get()
                ->map(function ($row) {
                    $payment = $row->payments->first();

                    return [
                        'id'                => $row->id,
                        'full_name'         => $row->full_name,
                        'gender'            => $row->gender,
                        'bank_name'         => $row->bank_name,
                        'bank_code'         => $row->bank_code,
                        'account_number'    => $row->account_number,
                        'account_name'      => $row->account_name,
                        'duty_post'         => $row->duty_post,
                        'source_identity'   => $row->source_identity,
                        'amount'            => (float) $row->amount,
                        'remark'            => $row->remark,
                        'recipient_code'    => $row->recipient_code,
                        'recipient_status'  => $row->recipient_status,
                        'recipient_message' => $row->recipient_message,
                        'payment_status'    => $payment?->status,
                        'payment_message'   => $payment?->message,
                        'paid'              => $row->live_payments_count > 0,
                    ];
                })
            : collect();

        return inertia('Admin/BulkTransferImport', [
            'batches'    => $batches,
            'selectedId' => $selectedId ? (int) $selectedId : null,
            'rows'       => $rows,
        ]);
    }

    // ── 1. Import ───────────────────────────────────────────────────────────

    /**
     * Import a sheet into a NEW batch. Nothing is queued here — bank matching
     * and recipient creation are separate, deliberate steps.
     */
    public function import(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|max:20480',
            'name' => 'nullable|string|max:120',
        ]);

        $file = $request->file('file');

        try {
            $parsed = $this->parse($file);
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => 'Could not read that file: ' . $e->getMessage()]);
        }

        if (empty($parsed)) {
            return back()->withErrors(['file' => 'No usable rows found. A name, a bank name and an account number are needed.']);
        }

        $batch = BulkTransferBatch::create([
            'reference' => 'BT-' . now()->format('ymd') . '-' . strtoupper(Str::random(4)),
            'name'      => $validated['name'] ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'file_name' => $file->getClientOriginalName(),
        ]);

        $created = 0;
        $skipped = [];
        $seen    = [];

        foreach ($parsed as $row) {
            // Every rejection is recorded with the sheet line number, so a
            // dropped row can be found and fixed rather than just counted.
            $reason = match (true) {
                $row['full_name'] === ''         => 'No full name',
                $row['bank_name'] === ''         => 'No bank name',
                $row['account_number'] === null  => 'No account number',
                // An account repeated inside one sheet is one person listed
                // twice; the first row wins, as the APO/PO roster behaves.
                isset($seen[$row['account_number']]) => 'Duplicate account — already on line ' . $seen[$row['account_number']],
                default => null,
            };

            if ($reason) {
                $skipped[] = [
                    'line'           => $row['_line'],
                    'full_name'      => $row['full_name'] ?: '(blank)',
                    'bank_name'      => $row['bank_name'] ?: '(blank)',
                    'account_number' => $row['account_number'] ?? '(blank)',
                    'amount'         => $row['amount'],
                    'reason'         => $reason,
                ];
                continue;
            }

            $seen[$row['account_number']] = $row['_line'];

            unset($row['_line']);
            BulkTransferRecipient::create($row + ['batch_id' => $batch->id]);
            $created++;
        }

        if ($created === 0) {
            $batch->delete();

            return back()->withErrors(['file' => 'Nothing could be imported from that file.']);
        }

        $batch->update([
            'rows_read'     => count($parsed),
            'skipped_count' => count($skipped),
            'skipped_rows'  => $skipped,
        ]);

        $message = "Batch {$batch->reference}: {$created} of " . count($parsed) . " row(s) imported.";

        if ($skipped) {
            $counts = collect($skipped)
                // "Duplicate account — already on line 12" and "…line 40" are
                // the same kind of problem; group them as one.
                ->countBy(fn ($s) => str_starts_with($s['reason'], 'Duplicate') ? 'Duplicate account' : $s['reason'])
                ->map(fn ($n, $reason) => "{$n} {$reason}")
                ->implode(', ');

            $message .= ' ' . count($skipped) . " skipped ({$counts}) — see the skipped list below.";
        }

        $message .= ' Next: match bank codes.';

        return redirect()->route('admin.bulk-transfer-import', ['batch' => $batch->id])->with('success', $message);
    }

    // ── 2. Match bank codes ─────────────────────────────────────────────────

    public function matchBankCodes(BulkTransferBatch $batch, PaystackService $paystack)
    {
        $rows = $batch->recipients()->missingBankCode()->get();

        if ($rows->isEmpty()) {
            return back()->with('success', 'Every row in this batch already has a bank code.');
        }

        $matcher = new BankMatcher($paystack);

        if (!$matcher->hasBanks()) {
            return back()->with('error', 'Could not fetch the bank list from Paystack. Try again shortly.');
        }

        $matched   = 0;
        $unmatched = [];

        foreach ($rows as $row) {
            $code = $matcher->codeFor($row->bank_name);

            if ($code) {
                $row->update(['bank_code' => $code]);
                $matched++;
            } else {
                $unmatched[$row->bank_name] = true;
            }
        }

        $message = "Matched a bank code for {$matched} of {$rows->count()} row(s).";

        if ($unmatched) {
            $message .= ' No match for: ' . implode(', ', array_slice(array_keys($unmatched), 0, 8))
                . (count($unmatched) > 8 ? ' …' : '') . '. Fix those bank names and run it again.';
        }

        return back()->with('success', $message);
    }

    // ── 3. Create recipients ────────────────────────────────────────────────

    public function generateRecipients(BulkTransferBatch $batch)
    {
        $rows = $batch->recipients()->needsRecipient()->get();

        if ($rows->isEmpty()) {
            return back()->with('success', 'Every row in this batch already has a transfer recipient.');
        }

        // Queued individually, not chained: a broken chain would leave most of
        // the batch with no recipient. Each job paces itself before calling
        // Paystack, and a single worker runs them one at a time.
        $rows->each(fn ($row) => CreateBulkTransferRecipientJob::dispatch($row->id));

        return back()->with('success', "Queued recipient creation for {$rows->count()} row(s). Refresh shortly to see results.");
    }

    // ── 4. Send the transfer ────────────────────────────────────────────────

    public function sendBulkTransfer(BulkTransferBatch $batch)
    {
        $rows = $batch->recipients()->payable()->get();

        if ($rows->isEmpty()) {
            $alreadyPaid = $batch->recipients()->whereHas('payments', fn ($q) => $q->whereNotNull('paid_key'))->count();
            $noRecipient = $batch->recipients()->needsRecipient()->count();
            $noAmount    = $batch->recipients()->where(fn ($q) => $q->whereNull('amount')->orWhere('amount', '<=', 0))->count();

            $reasons = [];

            if ($alreadyPaid) {
                $reasons[] = "{$alreadyPaid} already paid";
            }

            if ($noRecipient) {
                $reasons[] = "{$noRecipient} without a transfer recipient";
            }

            if ($noAmount) {
                $reasons[] = "{$noAmount} with no amount";
            }

            return back()->with('error', 'Nobody in this batch is payable' . ($reasons ? ' — ' . implode(', ', $reasons) . '.' : '.'));
        }

        // Each row is paid its OWN amount. Every job claims a unique key before
        // transferring, so nobody can be paid twice however this is scheduled.
        $rows->each(fn ($row) => PayBulkTransferRecipientJob::dispatch($row->id, (float) $row->amount));

        $total = $rows->sum('amount');

        return back()->with('success', "Queued {$rows->count()} transfer(s) totalling ₦" . number_format($total, 2) . '.');
    }

    public function pay(BulkTransferRecipient $bulkTransferRecipient)
    {
        if ($bulkTransferRecipient->hasLivePayment()) {
            return back()->with('error', "{$bulkTransferRecipient->full_name} already has a payment on record.");
        }

        if (!$bulkTransferRecipient->recipient_code) {
            return back()->with('error', "{$bulkTransferRecipient->full_name} has no transfer recipient yet.");
        }

        if ((float) $bulkTransferRecipient->amount <= 0) {
            return back()->with('error', "{$bulkTransferRecipient->full_name} has no amount set.");
        }

        PayBulkTransferRecipientJob::dispatch($bulkTransferRecipient->id, (float) $bulkTransferRecipient->amount);

        return back()->with('success', "Queued ₦" . number_format($bulkTransferRecipient->amount, 2) . " for {$bulkTransferRecipient->full_name}.");
    }

    public function destroy(BulkTransferRecipient $bulkTransferRecipient)
    {
        if ($bulkTransferRecipient->hasLivePayment()) {
            return back()->with('error', "{$bulkTransferRecipient->full_name} has a payment on record and cannot be deleted.");
        }

        $name = $bulkTransferRecipient->full_name;
        $bulkTransferRecipient->delete();

        return back()->with('success', "{$name} removed from the batch.");
    }

    /**
     * Every skipped row as a CSV, so a big import's rejects can be worked
     * through in the spreadsheet they came from.
     */
    public function exportSkipped(BulkTransferBatch $batch)
    {
        $rows = $batch->skipped_rows ?? [];

        if (empty($rows)) {
            return back()->with('error', 'Nothing was skipped in this batch.');
        }

        $csv = "Sheet Line,Full Name,Bank Name,Account Number,Amount,Reason\n";

        foreach ($rows as $row) {
            $csv .= implode(',', array_map(
                // Quote everything: names carry commas, and a bare account
                // number would otherwise lose its leading zero in Excel.
                fn ($v) => '"' . str_replace('"', '""', (string) $v) . '"',
                [$row['line'], $row['full_name'], $row['bank_name'], $row['account_number'], $row['amount'] ?? '', $row['reason']]
            )) . "\n";
        }

        return response($csv, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $batch->reference . '-skipped.csv"',
        ]);
    }

    public function destroyBatch(BulkTransferBatch $batch)
    {
        $paid = $batch->recipients()->whereHas('payments', fn ($q) => $q->whereNotNull('paid_key'))->count();

        if ($paid > 0) {
            return back()->with('error', "{$batch->reference} has {$paid} paid row(s) and cannot be deleted.");
        }

        $reference = $batch->reference;
        $batch->delete();

        return redirect()->route('admin.bulk-transfer-import')->with('success', "Batch {$reference} deleted.");
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

        if (!isset($map['full_name']) || !isset($map['account_number'])) {
            throw new \RuntimeException('the sheet needs at least a Full Name column and an Account Number column.');
        }

        $rows = [];

        foreach (array_slice($sheet, 1) as $index => $line) {
            $cell = fn (?int $i) => $i === null ? '' : trim((string) ($line[$i] ?? ''));

            $name    = $cell($map['full_name'] ?? null);
            $account = $this->accountNumber($cell($map['account_number'] ?? null));

            // A wholly empty line is spreadsheet padding, not a rejected row —
            // counting those as "skipped" would inflate the number with noise.
            if ($name === '' && $account === null && $cell($map['bank_name'] ?? null) === '') {
                continue;
            }

            $rows[] = [
                // +2: one for the header row, one because rows are 1-indexed
                // in the spreadsheet the user is looking at.
                '_line'           => $index + 2,
                'full_name'       => $name,
                'gender'          => $cell($map['gender'] ?? null) ?: null,
                'bank_name'       => $cell($map['bank_name'] ?? null),
                'bank_code'       => $cell($map['bank_code'] ?? null) ?: null,
                'account_number'  => $account,
                'account_name'    => $cell($map['account_name'] ?? null) ?: null,
                'duty_post'       => $cell($map['duty_post'] ?? null) ?: null,
                'source_identity' => $cell($map['source_identity'] ?? null) ?: null,
                'amount'          => $this->money($cell($map['amount'] ?? null)),
                'remark'          => $cell($map['remark'] ?? null) ?: null,
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
