<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\CreateBulkTransferRecipientJob;
use App\Jobs\PayBulkTransferRecipientJob;
use App\Models\BulkTransferPayment;
use App\Models\BulkTransferRecipient;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Import a list of people to pay, resolve each one into a Paystack transfer
 * recipient, then send the same amount to all of them.
 *
 * The amount is entered on the page at transfer time rather than stored — one
 * imported list can be paid a different amount than the last, and nothing about
 * the roster implies what anyone is owed.
 */
class BulkTransferImportController extends Controller
{
    private const HEADER_ALIASES = [
        'full_name'      => ['fullname', 'name', 'beneficiary', 'beneficiaryname', 'surnameandname'],
        'bank_name'      => ['bankname', 'bank'],
        'bank_code'      => ['bankcode', 'code'],
        'account_number' => ['accountnumber', 'acctnumber', 'accountno', 'acctno', 'nuban'],
        'account_name'   => ['accountname', 'acctname'],
    ];

    public function index()
    {
        $rows = BulkTransferRecipient::withCount(['payments as live_payments_count' => fn ($q) => $q->whereNotNull('paid_key')])
            ->with(['payments' => fn ($q) => $q->latest()->limit(1)])
            ->orderBy('full_name')
            ->get()
            ->map(function ($row) {
                $payment = $row->payments->first();

                return [
                    'id'                => $row->id,
                    'full_name'         => $row->full_name,
                    'bank_name'         => $row->bank_name,
                    'bank_code'         => $row->bank_code,
                    'account_number'    => $row->account_number,
                    'account_name'      => $row->account_name,
                    'recipient_code'    => $row->recipient_code,
                    'recipient_status'  => $row->recipient_status,
                    'recipient_message' => $row->recipient_message,
                    'payment_status'    => $payment?->status,
                    'payment_message'   => $payment?->message,
                    'paid_amount'       => $payment && $payment->paid_key ? $payment->amount : null,
                    'paid'              => $row->live_payments_count > 0,
                ];
            });

        return inertia('Admin/BulkTransferImport', [
            'rows'  => $rows,
            'stats' => [
                'total'          => $rows->count(),
                'with_recipient' => $rows->where('recipient_status', 'success')->count(),
                'failed_recipient' => $rows->where('recipient_status', 'failed')->count(),
                'pending_recipient' => $rows->whereNull('recipient_status')->count(),
                'paid'           => $rows->where('paid', true)->count(),
                'unpaid'         => $rows->where('paid', false)->count(),
                'amount_paid'    => (float) BulkTransferPayment::where('status', 'success')->sum('amount'),
            ],
        ]);
    }

    /**
     * Import the list and immediately queue recipient resolution for every new
     * or still-unresolved row — bank matching and recipient creation both
     * happen inside that job.
     */
    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file|max:20480']);

        try {
            $parsed = $this->parse($request->file('file'));
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => 'Could not read that file: ' . $e->getMessage()]);
        }

        if (empty($parsed)) {
            return back()->withErrors(['file' => 'No usable rows found. A name, a bank name and an account number are needed.']);
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $queue   = [];

        foreach ($parsed as $row) {
            if ($row['full_name'] === '' || $row['bank_name'] === '' || $row['account_number'] === null) {
                $skipped++;
                continue;
            }

            $existing = BulkTransferRecipient::where('account_number', $row['account_number'])->first();

            if ($existing) {
                // Never wipe an existing recipient with blanks from a new sheet.
                $existing->update(array_filter($row, fn ($v) => $v !== null && $v !== ''));
                $updated++;

                if ($existing->recipient_status !== 'success') {
                    $queue[] = $existing->id;
                }

                continue;
            }

            $queue[] = BulkTransferRecipient::create($row)->id;
            $created++;
        }

        if ($queue) {
            // Dispatched individually, not chained: one dead job in a chain
            // orphans every job after it, so a single failure would leave most
            // of the list with no recipient at all.
            foreach ($queue as $id) {
                CreateBulkTransferRecipientJob::dispatch($id);
            }
        }

        $message = "Imported {$created} row(s)" . ($updated ? ", updated {$updated} existing" : '') . '.';

        if ($queue) {
            $message .= ' Matching banks and creating recipients for ' . count($queue) . ' — refresh shortly to see results.';
        }

        if ($skipped) {
            $message .= " {$skipped} row(s) skipped — name, bank name and account number are all required.";
        }

        return back()->with('success', $message);
    }

    /** Re-run recipient resolution for anything not yet successful. */
    public function retryRecipients()
    {
        $rows = BulkTransferRecipient::needsRecipient()->get();

        if ($rows->isEmpty()) {
            return back()->with('success', 'Every row already has a transfer recipient.');
        }

        $rows->each(fn ($row) => CreateBulkTransferRecipientJob::dispatch($row->id));

        return back()->with('success', "Retrying recipient creation for {$rows->count()} row(s).");
    }

    public function sendBulkTransfer(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
        ]);

        $amount = (float) $validated['amount'];
        $rows   = BulkTransferRecipient::payable()->get();

        if ($rows->isEmpty()) {
            $alreadyPaid = BulkTransferRecipient::whereHas('payments', fn ($q) => $q->whereNotNull('paid_key'))->count();
            $noRecipient = BulkTransferRecipient::needsRecipient()->count();

            $reasons = [];

            if ($alreadyPaid) {
                $reasons[] = "{$alreadyPaid} already paid";
            }

            if ($noRecipient) {
                $reasons[] = "{$noRecipient} without a transfer recipient";
            }

            return back()->with('error', 'Nobody is payable' . ($reasons ? ' — ' . implode(', ', $reasons) . '.' : '.'));
        }

        // One job per recipient, queued individually rather than chained: a
        // broken chain would silently leave most of the list unpaid. Each job
        // claims a unique key before transferring, so nobody can be paid twice
        // however the jobs are scheduled.
        $rows->each(fn ($row) => PayBulkTransferRecipientJob::dispatch($row->id, $amount));

        return back()->with('success', 'Queued ₦' . number_format($amount, 2) . " for {$rows->count()} recipient(s). Total ₦" . number_format($amount * $rows->count(), 2) . '.');
    }

    public function pay(Request $request, BulkTransferRecipient $bulkTransferRecipient)
    {
        $validated = $request->validate(['amount' => 'required|numeric|min:1']);

        if ($bulkTransferRecipient->hasLivePayment()) {
            return back()->with('error', "{$bulkTransferRecipient->full_name} already has a payment on record.");
        }

        if ($bulkTransferRecipient->recipient_status !== 'success') {
            return back()->with('error', "{$bulkTransferRecipient->full_name} has no transfer recipient yet.");
        }

        PayBulkTransferRecipientJob::dispatch($bulkTransferRecipient->id, (float) $validated['amount']);

        return back()->with('success', "Queued payment for {$bulkTransferRecipient->full_name}.");
    }

    public function destroy(BulkTransferRecipient $bulkTransferRecipient)
    {
        if ($bulkTransferRecipient->hasLivePayment()) {
            return back()->with('error', "{$bulkTransferRecipient->full_name} has a payment on record and cannot be deleted.");
        }

        $name = $bulkTransferRecipient->full_name;
        $bulkTransferRecipient->delete();

        return back()->with('success', "{$name} removed from the list.");
    }

    public function clearUnpaid()
    {
        $count = BulkTransferRecipient::whereDoesntHave('payments', fn ($q) => $q->whereNotNull('paid_key'))->count();

        if ($count === 0) {
            return back()->with('error', 'Nothing to clear — every row has a payment on record.');
        }

        BulkTransferRecipient::whereDoesntHave('payments', fn ($q) => $q->whereNotNull('paid_key'))->delete();

        return back()->with('success', "Cleared {$count} unpaid row(s). Paid rows were kept.");
    }

    /**
     * @return array<int, array<string, string|null>>
     */
    private function parse(UploadedFile $file): array
    {
        $sheet = IOFactory::load($file->getRealPath())->getActiveSheet()->toArray(null, true, false, false);

        if (empty($sheet)) {
            return [];
        }

        $map = [];

        foreach ($sheet[0] ?? [] as $index => $heading) {
            $normalised = preg_replace('/[^a-z]/', '', strtolower((string) $heading));

            if ($normalised === '') {
                continue;
            }

            foreach (self::HEADER_ALIASES as $field => $aliases) {
                if (isset($map[$field])) {
                    continue;
                }

                foreach ($aliases as $alias) {
                    if ($normalised === preg_replace('/[^a-z]/', '', $alias)) {
                        $map[$field] = $index;
                        break 2;
                    }
                }
            }
        }

        // No headings recognised — fall back to the documented column order.
        if (!isset($map['full_name']) || !isset($map['account_number'])) {
            $map = ['full_name' => 0, 'bank_name' => 1, 'bank_code' => 2, 'account_number' => 3, 'account_name' => 4];
            $body = $sheet;
        } else {
            $body = array_slice($sheet, 1);
        }

        $rows = [];

        foreach ($body as $line) {
            $cell = fn (?int $i) => $i === null ? '' : trim((string) ($line[$i] ?? ''));

            $name    = $cell($map['full_name'] ?? null);
            $account = $this->accountNumber($cell($map['account_number'] ?? null));

            if ($name === '' && $account === null) {
                continue;
            }

            $rows[] = [
                'full_name'      => $name,
                'bank_name'      => $cell($map['bank_name'] ?? null),
                'bank_code'      => $cell($map['bank_code'] ?? null) ?: null,
                'account_number' => $account,
                'account_name'   => $cell($map['account_name'] ?? null) ?: null,
            ];
        }

        return $rows;
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
