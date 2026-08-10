<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\PurchaseImportedAirtimeJob;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Buys airtime for a list of phone numbers uploaded as CSV/Excel, on a network
 * chosen at upload time. The sheet only needs a "Phone Number" column.
 */
class ImportedAirtimeController extends Controller
{
    private const PHONE_ALIASES = ['phonenumber', 'phone', 'phoneno', 'number', 'mobile', 'mobilenumber', 'msisdn', 'tel', 'telephone', 'contact'];

    /** Preview the file's numbers without buying anything yet. */
    public function preview(Request $request)
    {
        $request->validate(['file' => 'required|file|max:20480']);

        try {
            $numbers = $this->parse($request->file('file'));
        } catch (\Throwable $e) {
            return back()->withErrors(['import' => 'Could not read that file: ' . $e->getMessage()]);
        }

        if (empty($numbers)) {
            return back()->withErrors(['import' => 'No phone numbers found. The sheet needs a "Phone Number" column with numbers under it.']);
        }

        return back()->with('importedContacts', [
            'numbers' => $numbers,
            'count'   => count($numbers),
        ]);
    }

    public function send(Request $request)
    {
        $validated = $request->validate([
            'network'       => 'required|string|max:50',
            'phone_numbers' => 'required|array|min:1',
            // 10–15 digits covers local and international forms.
            'phone_numbers.*' => ['required', 'string', 'regex:/^\d{10,15}$/'],
            'amount'        => 'nullable|numeric|min:1',
        ], [
            'phone_numbers.*.regex' => 'One of the imported numbers is not a valid phone number.',
        ]);

        $amount = (float) ($validated['amount'] ?? Setting::get('airtime_amount', 0));

        if ($amount <= 0) {
            return back()->with('error', 'Set an airtime amount in Settings, or enter one on this form, before sending.');
        }

        $numbers = collect($validated['phone_numbers'])->unique()->values();

        // Chained, not batched: EasiGateway takes one number per call.
        $jobs = $numbers->map(fn ($number) => new PurchaseImportedAirtimeJob($number, $validated['network'], $amount))->all();
        Bus::chain($jobs)->dispatch();

        return back()->with('success', "Queued {$numbers->count()} airtime purchase(s) of ₦" . number_format($amount, 2) . " on {$validated['network']}. Check Airtime History shortly for results.");
    }

    /**
     * Reads csv/xlsx/xls/ods. Falls back to the first column when the sheet has
     * no recognisable heading, so a bare list of numbers still works.
     *
     * @return array<int, string>
     */
    private function parse(UploadedFile $file): array
    {
        $sheet = IOFactory::load($file->getRealPath())->getActiveSheet()->toArray(null, true, false, false);

        if (empty($sheet)) {
            return [];
        }

        $column   = null;
        $skipHead = false;

        foreach ($sheet[0] ?? [] as $index => $heading) {
            $normalised = preg_replace('/[^a-z]/', '', strtolower((string) $heading));

            if ($normalised !== '' && in_array($normalised, self::PHONE_ALIASES, true)) {
                $column   = $index;
                $skipHead = true;
                break;
            }
        }

        // No heading matched — treat it as a bare list in the first column.
        $column ??= 0;
        $rows = $skipHead ? array_slice($sheet, 1) : $sheet;

        $numbers = [];

        foreach ($rows as $line) {
            $number = $this->normalise((string) ($line[$column] ?? ''));

            if ($number !== null) {
                $numbers[$number] = true;
            }
        }

        return array_keys($numbers);
    }

    /**
     * Restores the leading zero Excel strips from 08012345678, and folds
     * +234/234 forms into the same local number.
     */
    private function normalise(string $value): ?string
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

        return strlen($digits) >= 10 ? $digits : null;
    }
}
