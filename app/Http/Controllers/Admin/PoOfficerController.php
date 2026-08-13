<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\CreatePoRecipientJob;
use App\Jobs\PayPoOfficerJob;
use App\Models\PoOfficer;
use App\Models\PoPayment;
use App\Models\Setting;
use App\Services\PaystackService;
use App\Support\BankMatcher;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Standalone APO/PO officer roster: import, bank-code matching and recipient
 * creation. Payment itself happens at check-in, from the check-in officer's
 * LGA-scoped portal — there is no bulk transfer and no checkout.
 *
 * Postings (LGA / PU / RA-Ward / role) are stored as plain text; this module is
 * deliberately not joined to the geo tables.
 */
class PoOfficerController extends Controller
{
    /** Where a previewed upload waits until it is confirmed or discarded. */
    private const IMPORT_DIR = 'po-imports';

    /**
     * Sheet headings, normalised to letters only. Bank details arrive under
     * either databoy or NGO headings; whichever is present wins.
     */
    private const HEADER_ALIASES = [
        'final_surname'    => ['finalsurname', 'surname', 'lastname', 'familyname'],
        'final_first_name' => ['finalfirstname', 'firstname', 'finalfirst', 'givenname'],
        'final_other_name' => ['finalothername', 'othername', 'othernames', 'middlename'],
        'phone_number'     => ['phonenumber', 'phone', 'mobile', 'phoneno'],
        // bank_code before bank_name: "NGO Bank Code" contains both "bankcode"
        // and — with a looser needle — "bank", and the code must win.
        'bank_code'        => ['ngobankcode', 'databoybankcode', 'bankcode'],
        'bank_name'        => ['databoybankname', 'ngobankname', 'bankname'],
        // account_number before account_name for the same reason.
        'account_number'   => ['databoyaccountnumber', 'ngoaccountnumber', 'accountnumber', 'acctnumber', 'accountno', 'nuban'],
        'account_name'     => ['databoyaccountname', 'ngoaccountname', 'accountname', 'acctname'],
        'final_lga'        => ['finallga', 'lga'],
        'final_ra_ward'    => ['finalraward', 'raward', 'ward'],
        'final_pu'         => ['finalpu', 'pollingunit', 'pu'],
        'final_role'       => ['finalrole', 'role'],
    ];

    public function index()
    {
        $officers = PoOfficer::withCount(['payments as live_payments_count' => fn ($q) => $q->whereNotNull('paid_key')])
            ->with(['payments' => fn ($q) => $q->latest()->limit(1), 'checkedInBy:id,full_name'])
            ->orderBy('final_surname')->orderBy('final_first_name')
            ->get()
            ->map(function ($officer) {
                $payment = $officer->payments->first();

                return [
                    'id'               => $officer->id,
                    'full_name'        => $officer->full_name,
                    'final_surname'    => $officer->final_surname,
                    'final_first_name' => $officer->final_first_name,
                    'final_other_name' => $officer->final_other_name,
                    'phone_number'     => $officer->phone_number,
                    'bank_name'        => $officer->bank_name,
                    'bank_code'        => $officer->bank_code,
                    'account_number'   => $officer->account_number,
                    'account_name'     => $officer->account_name,
                    'final_lga'        => $officer->final_lga,
                    'final_pu'         => $officer->final_pu,
                    'final_ra_ward'    => $officer->final_ra_ward,
                    'final_role'       => $officer->final_role,
                    'checked_in_at'    => $officer->checked_in_at,
                    'checked_in_by'    => $officer->checkedInBy->full_name ?? null,
                    'recipient_status' => $officer->recipient_status,
                    'recipient_message' => $officer->recipient_message,
                    'payment_status'   => $payment?->status,
                    'payment_message'  => $payment?->message,
                    'paid'             => $officer->live_payments_count > 0,
                ];
            });

        $amount = (float) Setting::get('po_payment_amount', 0);

        return inertia('Admin/PoOfficers', [
            'officers' => $officers,
            'amount'   => $amount,
            'stats'    => [
                'total'          => $officers->count(),
                // One pass, not whereNull() + where('', '') added together:
                // Collection::where compares loosely, so null == '' matched the
                // same rows twice and doubled the count.
                'missing_code'   => $officers->filter(fn ($o) => empty($o['bank_code']))->count(),
                'with_recipient' => $officers->where('recipient_status', 'success')->count(),
                'checked_in'     => $officers->whereNotNull('checked_in_at')->count(),
                'paid'           => $officers->where('paid', true)->count(),
                'unpaid'         => $officers->where('paid', false)->count(),
                'amount_paid'    => (float) PoPayment::where('status', 'success')->sum('amount'),
            ],
        ]);
    }

    // ── 1. Import the roster ────────────────────────────────────────────────

    /**
     * Parse the upload and show what WOULD happen, without writing anything.
     *
     * The file is stashed under a token so the confirm step re-reads the exact
     * bytes that were previewed — re-uploading could otherwise import a
     * different file than the one the summary described.
     */
    public function preview(Request $request)
    {
        $request->validate(['file' => 'required|file|max:20480']);

        // Previews that were never confirmed or cancelled would otherwise pile
        // up in storage forever.
        $this->pruneStaleUploads();

        $file  = $request->file('file');
        $token = (string) Str::uuid();
        $file->storeAs(self::IMPORT_DIR, $token . '.' . ($file->getClientOriginalExtension() ?: 'xlsx'), 'local');

        try {
            $rows = $this->parse($this->storedFile($token));
        } catch (\Throwable $e) {
            $this->discardStored($token);

            return back()->withErrors(['file' => 'Could not read that file: ' . $e->getMessage()]);
        }

        if (empty($rows)) {
            $this->discardStored($token);

            return back()->withErrors(['file' => 'No usable rows found in that file.']);
        }

        $ready   = [];
        $skipped = [];

        foreach ($rows as $row) {
            $reason = $this->rejectionReason($row);

            if ($reason) {
                $skipped[] = [
                    'name'   => trim("{$row['final_surname']} {$row['final_first_name']}") ?: '(blank row)',
                    'reason' => $reason,
                ];
                continue;
            }

            $ready[] = $row;
        }

        $existing = PoOfficer::whereIn('account_number', array_column($ready, 'account_number'))->count();

        // Account numbers repeated INSIDE this one file. Each repeat overwrites
        // the row before it, so the roster ends up smaller than the sheet and
        // one of the two people silently vanishes — worth showing up front
        // rather than leaving it to be discovered in the import totals.
        $seen       = [];
        $duplicates = [];

        foreach ($ready as $row) {
            $account = $row['account_number'];
            $name    = trim("{$row['final_surname']} {$row['final_first_name']}");

            if (isset($seen[$account])) {
                $duplicates[] = [
                    'account' => $account,
                    'kept'    => $seen[$account],
                    'skipped' => $name,
                ];
                continue;
            }

            $seen[$account] = $name;
        }

        return back()->with('poPreview', [
            'token'    => $token,
            'file'     => $file->getClientOriginalName(),
            'columns'  => $this->mappedColumnLabels($this->storedFile($token)),
            'total'    => count($rows),
            // Repeats within the file are not imported at all, so what will
            // actually be written is the distinct-account count.
            'ready'    => count($seen),
            'new'      => max(0, count($seen) - $existing),
            'updating' => $existing,
            'skipped'  => count($skipped),
            'duplicates'       => count($duplicates),
            'duplicateSample'  => array_slice($duplicates, 0, 10),
            // Enough to see the shape of the data without shipping 1500 rows.
            'sample'        => array_slice($ready, 0, 10),
            'skippedSample' => array_slice($skipped, 0, 10),
        ]);
    }

    /** Commit the previewed file. */
    public function import(Request $request)
    {
        $validated = $request->validate(['token' => 'required|string']);
        $path      = $this->storedPath($validated['token']);

        if (!$path || !file_exists($path)) {
            return back()->withErrors(['file' => 'That upload has expired — choose the file again.']);
        }

        try {
            $rows = $this->parse($this->storedFile($validated['token']));
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => 'Could not read that file: ' . $e->getMessage()]);
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $duplicateSkipped = 0;
        $skippedExamples = [];
        $seenAccounts = [];

        foreach ($rows as $row) {
            $reason = $this->rejectionReason($row);

            if ($reason) {
                $skipped++;

                if (count($skippedExamples) < 3) {
                    $skippedExamples[] = trim("{$row['final_surname']} {$row['final_first_name']}") . " ({$reason})";
                }

                continue;
            }

            // The same account number twice in one file: keep the first row and
            // drop the rest. Letting a repeat through would overwrite the row
            // before it, which silently loses one of two different people.
            if (isset($seenAccounts[$row['account_number']])) {
                $duplicateSkipped++;
                continue;
            }

            $seenAccounts[$row['account_number']] = true;

            // Account number identifies the officer, so a corrected re-upload
            // updates in place instead of creating a rival payout row.
            $existing = PoOfficer::where('account_number', $row['account_number'])->first();

            if ($existing) {
                // Never clear an existing bank code or recipient with blanks
                // from a fresh sheet.
                $existing->update(array_filter($row, fn ($v) => $v !== null && $v !== ''));
                $updated++;
                continue;
            }

            PoOfficer::create($row);
            $created++;
        }

        $this->discardStored($validated['token']);

        $message = "Imported {$created} officer(s)" . ($updated ? ", updated {$updated} existing" : '') . '.';

        if ($duplicateSkipped) {
            $message .= " {$duplicateSkipped} duplicate row(s) ignored — that account number already appeared earlier in the file.";
        }

        if ($skipped) {
            $message .= " {$skipped} row(s) skipped — a surname and an account number are required."
                . ($skippedExamples ? ' e.g. ' . implode('; ', $skippedExamples) . '.' : '');
        }

        return back()->with('success', $message);
    }

    /** Throw away a previewed upload the admin decided against. */
    public function cancelImport(Request $request)
    {
        $this->discardStored((string) $request->input('token'));

        return back();
    }

    /**
     * Why this row cannot be imported, or null if it can.
     *
     * Only two things actually matter: something to call the person by, and an
     * account to pay into. First and other name are both optional — plenty of
     * rows carry neither — so a surname alone is enough to import.
     */
    private function rejectionReason(array $row): ?string
    {
        return match (true) {
            $row['final_surname'] === ''    => 'no surname',
            $row['account_number'] === null => 'no account number',
            default                         => null,
        };
    }

    /** Human-readable "field <- heading(s)" for the preview. */
    private function mappedColumnLabels(UploadedFile $file): array
    {
        $sheet  = IOFactory::load($file->getRealPath())->getActiveSheet()->toArray(null, true, false, false);
        $header = $sheet[0] ?? [];
        $labels = [];

        foreach ($this->headerMap($header) as $field => $columns) {
            $labels[$field] = implode(', ', array_map(fn ($i) => trim((string) ($header[$i] ?? '')), $columns));
        }

        return $labels;
    }

    private function storedPath(string $token): ?string
    {
        if (!preg_match('/^[0-9a-f-]{36}$/i', $token)) {
            return null;
        }

        // Resolve through the disk, not storage_path(): Laravel 11+ roots the
        // local disk at storage/app/private, so a hand-built path misses.
        $dir = Storage::disk('local')->path(self::IMPORT_DIR);

        foreach (glob($dir . DIRECTORY_SEPARATOR . $token . '.*') ?: [] as $path) {
            return $path;
        }

        return null;
    }

    private function storedFile(string $token): UploadedFile
    {
        $path = $this->storedPath($token);

        return new UploadedFile($path, basename($path), null, null, true);
    }

    /** Delete previewed uploads older than a day. */
    private function pruneStaleUploads(): void
    {
        $dir = Storage::disk('local')->path(self::IMPORT_DIR);

        foreach (glob($dir . DIRECTORY_SEPARATOR . '*') ?: [] as $path) {
            if (is_file($path) && filemtime($path) < now()->subDay()->getTimestamp()) {
                @unlink($path);
            }
        }
    }

    private function discardStored(string $token): void
    {
        $path = $this->storedPath($token);

        if ($path && file_exists($path)) {
            @unlink($path);
        }
    }

    // ── 2. Match bank codes via Paystack ───────────────────────────────────

    /**
     * Fills in bank_code for officers that arrived without one, by matching
     * their written bank name against Paystack's bank list.
     */
    public function matchBankCodes(PaystackService $paystack)
    {
        $officers = PoOfficer::missingBankCode()->get();

        if ($officers->isEmpty()) {
            return back()->with('success', 'Every officer already has a bank code.');
        }

        $matcher = new BankMatcher($paystack);

        if (!$matcher->hasBanks()) {
            return back()->with('error', 'Could not fetch the bank list from Paystack. Try again shortly.');
        }

        $matched   = 0;
        $unmatched = [];

        foreach ($officers as $officer) {
            $code = $matcher->codeFor($officer->bank_name);

            if ($code) {
                $officer->update(['bank_code' => $code]);
                $matched++;
            } else {
                $unmatched[$officer->bank_name] = true;
            }
        }

        $message = "Matched a bank code for {$matched} of {$officers->count()} officer(s).";

        if ($unmatched) {
            $message .= ' No match for: ' . implode(', ', array_slice(array_keys($unmatched), 0, 8))
                . (count($unmatched) > 8 ? ' …' : '') . '. Fix those bank names and run it again.';
        }

        return back()->with('success', $message);
    }

    // ── 3. Generate transfer recipients ────────────────────────────────────

    public function generateRecipients()
    {
        $officers = PoOfficer::readyForRecipient()->get();

        if ($officers->isEmpty()) {
            return back()->with('success', 'Every officer already has a transfer recipient — nothing to queue.');
        }

        // Dispatched individually, NOT chained. A chain of 1500+ jobs is only
        // as long as its weakest link: if one job dies — a killed worker, a
        // Paystack timeout — every job after it is never queued at all, and
        // most of the roster silently ends up with no recipient. Queued
        // separately, a casualty costs exactly one officer, who can be retried.
        // A single worker still runs them one at a time, so nothing is
        // hammered either way.
        $officers->each(fn ($o) => CreatePoRecipientJob::dispatch($o->id));

        return back()->with('success', "Queued recipient creation for {$officers->count()} officer(s). Refresh shortly to see results.");
    }

    // ── 4. Payment ──────────────────────────────────────────────────────────
    // Officers are paid when a check-in officer confirms them present, from
    // their own LGA-scoped portal. retry() below is only for a check-in whose
    // payment failed.

    /**
     * Ask Paystack for the current state of every payment still sitting at
     * pending/unknown.
     *
     * Transfers settle asynchronously, so the status captured at initiation is
     * usually "pending" even when the money later lands. Without a webhook
     * those rows never move on their own.
     */
    public function refreshPaymentStatuses(PaystackService $paystack)
    {
        $payments = PoPayment::whereIn('status', ['pending', 'unknown'])
            ->whereNotNull('transfer_code')
            ->get();

        if ($payments->isEmpty()) {
            return back()->with('success', 'No payments are awaiting confirmation.');
        }

        $settled = 0;
        $failed  = 0;
        $still   = 0;

        foreach ($payments as $payment) {
            $result = $paystack->fetchTransfer($payment->transfer_code);

            if (!($result['status'] ?? false)) {
                $still++;
                continue;
            }

            $status = $this->normalizeTransferStatus($result['data']['status'] ?? null);

            if ($status === $payment->status) {
                $still++;
                continue;
            }

            // A confirmed failure frees the officer for a genuine retry; the
            // claim is only released once Paystack says no money moved.
            $payment->update([
                'status'   => $status,
                'message'  => $result['data']['reason'] ?? $payment->message,
                'paid_key' => $status === 'failed' ? null : $payment->paid_key,
            ]);

            $status === 'success' ? $settled++ : ($status === 'failed' ? $failed++ : $still++);
        }

        return back()->with('success', "Checked {$payments->count()} payment(s): {$settled} confirmed paid, {$failed} failed, {$still} still pending.");
    }

    /**
     * Anything not clearly success/failed stays 'unknown' — it must never be
     * auto-retried, because retrying a transfer that actually went through is
     * how someone gets paid twice.
     */
    private function normalizeTransferStatus(?string $status): string
    {
        return match (strtolower((string) $status)) {
            'success', 'successful' => 'success',
            'failed', 'abandoned', 'reversed' => 'failed',
            'pending', 'otp', 'processing', 'queued' => 'pending',
            default => 'unknown',
        };
    }

    public function retry(PoOfficer $poOfficer)
    {
        $amount = (float) Setting::get('po_payment_amount', 0);

        if ($amount <= 0) {
            return back()->with('error', 'Set the APO/PO officer amount in Settings before retrying.');
        }

        if (!$poOfficer->checked_in_at) {
            return back()->with('error', "{$poOfficer->full_name} has not been checked in yet — payment happens at check-in.");
        }

        if ($poOfficer->hasLivePayment()) {
            return back()->with('error', "{$poOfficer->full_name} already has a payment on record. Retry is only for failed attempts.");
        }

        if ($poOfficer->recipient_status !== 'success') {
            return back()->with('error', "{$poOfficer->full_name} has no transfer recipient yet.");
        }

        PayPoOfficerJob::dispatch($poOfficer->id, $amount);

        return back()->with('success', "Retrying payment for {$poOfficer->full_name}.");
    }

    public function destroy(PoOfficer $poOfficer)
    {
        if ($poOfficer->hasLivePayment()) {
            return back()->with('error', "{$poOfficer->full_name} has a payment on record and cannot be deleted.");
        }

        $name = $poOfficer->full_name;
        $poOfficer->delete();

        return back()->with('success', "{$name} removed from the roster.");
    }

    /**
     * @return array<int, array<string, string|null>>
     */
    /**
     * Every column a field could live in, not just the first one found.
     *
     * Sheets arrive with BOTH "Databoy Account Number" and "NGO Account Number"
     * columns, and any given person only has one of them filled. Binding a
     * single column per field silently skipped everyone whose value sat in the
     * other column, so each field keeps a list of candidate columns and the
     * first non-empty one wins per row.
     *
     * @return array<string, array<int>>
     */
    private function headerMap(array $header): array
    {
        $map   = [];
        $taken = [];

        $normalise = fn ($v) => preg_replace('/[^a-z]/', '', strtolower((string) $v));

        // Pass 1 — exact heading matches. These are unambiguous, so they claim
        // their column before any looser matching gets a chance at it.
        foreach ($header as $index => $heading) {
            $h = $normalise($heading);

            if ($h === '') {
                continue;
            }

            foreach (self::HEADER_ALIASES as $field => $aliases) {
                foreach ($aliases as $alias) {
                    if ($h === $normalise($alias)) {
                        $map[$field][] = $index;
                        $taken[$index] = true;
                        continue 3;
                    }
                }
            }
        }

        // Pass 2 — headings that carry extra words ("Databoy Account Number
        // (NUBAN)"). Only aliases of 8+ characters are used here: a short one
        // like "bank" would swallow "NGO Bank Code".
        foreach ($header as $index => $heading) {
            if (isset($taken[$index])) {
                continue;
            }

            $h = $normalise($heading);

            if ($h === '') {
                continue;
            }

            foreach (self::HEADER_ALIASES as $field => $aliases) {
                foreach ($aliases as $alias) {
                    $needle = $normalise($alias);

                    if (strlen($needle) >= 8 && str_contains($h, $needle)) {
                        $map[$field][] = $index;
                        $taken[$index] = true;
                        continue 3;
                    }
                }
            }
        }

        return $map;
    }

    private function parse(UploadedFile $file): array
    {
        $sheet = IOFactory::load($file->getRealPath())->getActiveSheet()->toArray(null, true, false, false);

        if (empty($sheet)) {
            return [];
        }

        $map = $this->headerMap($sheet[0] ?? []);

        if (!isset($map['final_surname'])) {
            throw new \RuntimeException('no "Final Surname" column was found in the sheet.');
        }

        if (!isset($map['account_number'])) {
            throw new \RuntimeException('no account number column was found — expected "Databoy Account Number" or "NGO Account Number".');
        }

        $rows = [];

        foreach (array_slice($sheet, 1) as $line) {
            // First non-empty value across every column mapped to the field.
            $pick = function (string $field) use ($map, $line): string {
                foreach ($map[$field] ?? [] as $index) {
                    $value = trim((string) ($line[$index] ?? ''));

                    if ($value !== '') {
                        return $value;
                    }
                }

                return '';
            };

            $surname = $pick('final_surname');
            $account = $this->digits($pick('account_number'));

            if ($surname === '' && $account === null) {
                continue;
            }

            $rows[] = [
                'final_surname'    => $surname,
                'final_first_name' => $pick('final_first_name'),
                'final_other_name' => $pick('final_other_name') ?: null,
                'phone_number'     => $this->phone($pick('phone_number')) ?? '',
                'bank_name'        => $pick('bank_name'),
                'bank_code'        => $pick('bank_code') ?: null,
                'account_number'   => $account,
                'account_name'     => $pick('account_name') ?: null,
                'final_lga'        => $pick('final_lga') ?: null,
                'final_pu'         => $pick('final_pu') ?: null,
                'final_ra_ward'    => $pick('final_ra_ward') ?: null,
                'final_role'       => $pick('final_role') ?: null,
            ];
        }

        return $rows;
    }

    /** Account numbers keep their leading zeros; Excel strips them. */
    private function digits(string $value): ?string
    {
        $digits = preg_replace('/\D/', '', $value);

        if ($digits === '') {
            return null;
        }

        return strlen($digits) < 10 ? str_pad($digits, 10, '0', STR_PAD_LEFT) : $digits;
    }

    private function phone(string $value): ?string
    {
        $digits = preg_replace('/\D/', '', $value);

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '234') && strlen($digits) === 13) {
            $digits = '0' . substr($digits, 3);
        }

        if (strlen($digits) === 10 && $digits[0] !== '0') {
            $digits = '0' . $digits;
        }

        return $digits;
    }
}
