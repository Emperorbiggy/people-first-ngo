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
use Illuminate\Support\Facades\Bus;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Standalone APO/PO officer roster: import, bank-code matching, recipient
 * creation and bulk payment. Postings (LGA / PU / RA-Ward / role) are stored as
 * plain text — this module is deliberately not joined to the geo tables.
 */
class PoOfficerController extends Controller
{
    /**
     * Sheet headings, normalised to letters only. Bank details arrive under
     * either databoy or NGO headings; whichever is present wins, databoy first.
     */
    private const HEADER_ALIASES = [
        'final_surname'    => ['finalsurname', 'surname', 'lastname'],
        'final_first_name' => ['finalfirstname', 'firstname', 'finalfirst'],
        'final_other_name' => ['finalothername', 'othername', 'othernames', 'middlename'],
        'phone_number'     => ['phonenumber', 'phone', 'mobile', 'phoneno', 'number'],
        'bank_name'        => ['databoybanknameorngobankname', 'databoybankname', 'ngobankname', 'bankname', 'bank'],
        'bank_code'        => ['ngobankcode', 'databoybankcode', 'bankcode'],
        'account_number'   => ['databoyaccountnumberorngoaccountnumber', 'databoyaccountnumber', 'ngoaccountnumber', 'accountnumber', 'acctnumber'],
        'account_name'     => ['databoyaccountnameorngoaccountname', 'databoyaccountname', 'ngoaccountname', 'accountname', 'acctname'],
        'final_lga'        => ['finallga', 'lga'],
        'final_pu'         => ['finalpu', 'pu', 'pollingunit'],
        'final_ra_ward'    => ['finalraward', 'raward', 'ward', 'ra'],
        'final_role'       => ['finalrole', 'role'],
    ];

    public function index()
    {
        $officers = PoOfficer::withCount(['payments as live_payments_count' => fn ($q) => $q->whereNotNull('paid_key')])
            ->with(['payments' => fn ($q) => $q->latest()->limit(1)])
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
                'missing_code'   => $officers->whereNull('bank_code')->count() + $officers->where('bank_code', '')->count(),
                'with_recipient' => $officers->where('recipient_status', 'success')->count(),
                'paid'           => $officers->where('paid', true)->count(),
                'unpaid'         => $officers->where('paid', false)->count(),
                'amount_paid'    => (float) PoPayment::where('status', 'success')->sum('amount'),
            ],
        ]);
    }

    // ── 1. Import the roster ────────────────────────────────────────────────

    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file|max:20480']);

        try {
            $rows = $this->parse($request->file('file'));
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => 'Could not read that file: ' . $e->getMessage()]);
        }

        if (empty($rows)) {
            return back()->withErrors(['file' => 'No usable rows found. A surname and an account number are the minimum.']);
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;

        foreach ($rows as $row) {
            if ($row['final_surname'] === '' || $row['account_number'] === null) {
                $skipped++;
                continue;
            }

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

        $message = "Imported {$created} officer(s)" . ($updated ? ", updated {$updated} existing" : '') . '.';

        if ($skipped) {
            $message .= " {$skipped} row(s) skipped — surname and account number are required.";
        }

        return back()->with('success', $message);
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
            $missing = PoOfficer::missingBankCode()->count();

            return back()->with('error', $missing > 0
                ? "No officer is ready. {$missing} still have no bank code — run Match Bank Codes first."
                : 'Every officer already has a transfer recipient.');
        }

        // Chained so recipient creation runs one at a time rather than
        // hammering Paystack with the whole roster at once.
        Bus::chain($officers->map(fn ($o) => new CreatePoRecipientJob($o->id))->all())->dispatch();

        return back()->with('success', "Queued recipient creation for {$officers->count()} officer(s). Refresh shortly to see results.");
    }

    // ── 4. Bulk transfer ───────────────────────────────────────────────────

    public function sendBulkTransfer()
    {
        $amount = (float) Setting::get('po_payment_amount', 0);

        if ($amount <= 0) {
            return back()->with('error', 'Set the APO/PO officer amount in Settings before sending.');
        }

        $officers = PoOfficer::payable()->get();

        if ($officers->isEmpty()) {
            // Spell out both reasons — "no recipient" alone reads as if nobody
            // has been paid, when usually the rest simply already have been.
            $alreadyPaid = PoOfficer::whereHas('payments', fn ($q) => $q->whereNotNull('paid_key'))->count();
            $noRecipient = PoOfficer::where(fn ($q) => $q->whereNull('recipient_code')->orWhere('recipient_status', '!=', 'success'))->count();

            $reasons = [];

            if ($alreadyPaid) {
                $reasons[] = "{$alreadyPaid} already paid";
            }

            if ($noRecipient) {
                $reasons[] = "{$noRecipient} without a transfer recipient";
            }

            return back()->with('error', 'Nobody is payable' . ($reasons ? ' — ' . implode(', ', $reasons) . '.' : '.'));
        }

        // One job per officer, chained so transfers go out one after another.
        // Each job claims the officer's unique paid_key before transferring, so
        // even a duplicate dispatch cannot pay anyone twice.
        Bus::chain($officers->map(fn ($o) => new PayPoOfficerJob($o->id, $amount))->all())->dispatch();

        return back()->with('success', "Queued payment of ₦" . number_format($amount, 2) . " for {$officers->count()} officer(s).");
    }

    public function retry(PoOfficer $poOfficer)
    {
        $amount = (float) Setting::get('po_payment_amount', 0);

        if ($amount <= 0) {
            return back()->with('error', 'Set the APO/PO officer amount in Settings before retrying.');
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

        if (!isset($map['final_surname']) || !isset($map['account_number'])) {
            throw new \RuntimeException('the sheet needs at least a Final Surname column and an account number column.');
        }

        $rows = [];

        foreach (array_slice($sheet, 1) as $line) {
            $cell = fn (?int $i) => $i === null ? '' : trim((string) ($line[$i] ?? ''));

            $surname = $cell($map['final_surname'] ?? null);
            $account = $this->digits($cell($map['account_number'] ?? null));

            if ($surname === '' && $account === null) {
                continue;
            }

            $rows[] = [
                'final_surname'    => $surname,
                'final_first_name' => $cell($map['final_first_name'] ?? null),
                'final_other_name' => $cell($map['final_other_name'] ?? null) ?: null,
                'phone_number'     => $this->phone($cell($map['phone_number'] ?? null)) ?? '',
                'bank_name'        => $cell($map['bank_name'] ?? null),
                'bank_code'        => $cell($map['bank_code'] ?? null) ?: null,
                'account_number'   => $account,
                'account_name'     => $cell($map['account_name'] ?? null) ?: null,
                'final_lga'        => $cell($map['final_lga'] ?? null) ?: null,
                'final_pu'         => $cell($map['final_pu'] ?? null) ?: null,
                'final_ra_ward'    => $cell($map['final_ra_ward'] ?? null) ?: null,
                'final_role'       => $cell($map['final_role'] ?? null) ?: null,
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
