<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Lga;
use App\Models\State;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;

class AttendanceController extends Controller
{
    /**
     * Column headings seen in the wild, normalised to letters only. Order
     * matters only in that the first match wins.
     */
    private const HEADER_ALIASES = [
        'surname'      => ['surname', 'lastname', 'familyname'],
        'firstname'    => ['firstname', 'first name', 'givenname', 'fname'],
        'othernames'   => ['othernames', 'othername', 'middlename', 'middlenames', 'other names'],
        'lga'          => ['lga', 'localgovernment', 'localgovernmentarea', 'lganame', 'localgovt', 'lgaofresidence', 'council'],
        'phone_number' => ['phone', 'phonenumber', 'phoneno', 'callingphonenumber', 'mobile', 'mobilenumber', 'tel', 'telephone', 'contact', 'number'],
    ];

    /** Every attendee is Osun state — LGA names are resolved within it. */
    private const STATE_NAME = 'Osun';

    public function index(Request $request)
    {
        $attendees = Attendance::orderBy('surname')->orderBy('firstname')
            ->get(['id', 'surname', 'firstname', 'othernames', 'lga', 'phone_number', 'present', 'marked_present_at']);

        return inertia('Admin/Attendance', [
            'attendees' => $attendees,
            'lgas'      => $attendees->pluck('lga')->filter()->unique()->sort()->values(),
            'stats'     => [
                'total'   => $attendees->count(),
                'present' => $attendees->where('present', true)->count(),
                'absent'  => $attendees->where('present', false)->count(),
            ],
        ]);
    }

    public function showImport()
    {
        return inertia('Admin/AttendanceImport', [
            'existing' => Attendance::count(),
        ]);
    }

    public function import(Request $request)
    {
        $request->validate([
            // Anything a spreadsheet is plausibly saved as. The parser works
            // off the file's actual contents, not its extension.
            'file' => 'required|file|max:20480',
        ]);

        try {
            $rows = $this->parse($request->file('file'));
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => 'Could not read that file: ' . $e->getMessage()]);
        }

        if (empty($rows)) {
            return back()->withErrors(['file' => 'No usable rows found. Make sure the sheet has a name column with data under it.']);
        }

        $created   = 0;
        $updated   = 0;
        $skipped   = 0;
        $unmatched = [];

        foreach ($rows as $row) {
            // Surname, firstname, LGA and phone are required — a row missing
            // any of them can't be called or contacted, so it isn't an
            // attendee. Othernames is optional; plenty of people have none.
            if ($row['surname'] === '' || $row['firstname'] === '' || $row['lga'] === '' || !$row['phone_number']) {
                $skipped++;
                continue;
            }

            [$lgaId, $lgaName] = $this->resolveLga($row['lga']);

            if (!$lgaId) {
                $unmatched[$lgaName] = true;
            }

            $payload = [
                'surname'      => $row['surname'],
                'firstname'    => $row['firstname'],
                'othernames'   => $row['othernames'] ?: null,
                'lga'          => $lgaName,
                'lga_id'       => $lgaId,
                'phone_number' => $row['phone_number'],
            ];

            // Re-uploading a corrected list should update people, not clone
            // them, so an existing phone number wins.
            $existing = Attendance::where('phone_number', $row['phone_number'])->first();

            if ($existing) {
                // present/marked_present_at are deliberately untouched — an
                // import must never wipe attendance already taken.
                $existing->update(array_filter($payload, fn ($value) => $value !== null && $value !== ''));
                $updated++;
                continue;
            }

            Attendance::create($payload + ['present' => false]);
            $created++;
        }

        $message = "Imported {$created} new attendee(s)" . ($updated ? ", updated {$updated} existing" : '') . '.';

        if ($skipped) {
            $message .= " {$skipped} row(s) skipped — surname, firstname, LGA and phone number are all required.";
        }

        if ($unmatched) {
            $message .= ' Unrecognised LGA(s) kept as typed: ' . implode(', ', array_keys($unmatched)) . '.';
        }

        return back()->with('success', $message);
    }

    public function toggle(Attendance $attendance)
    {
        $nowPresent = !$attendance->present;

        $attendance->update([
            'present'           => $nowPresent,
            'marked_present_at' => $nowPresent ? now() : null,
        ]);

        return back()->with('success', $nowPresent
            ? "{$attendance->name} marked present."
            : "{$attendance->name} is no longer marked present.");
    }

    public function destroy(Attendance $attendance)
    {
        $name = $attendance->name;
        $attendance->delete();

        return back()->with('success', "{$name} removed from the attendance list.");
    }

    /**
     * Reads csv/xlsx/xls/ods alike — IOFactory sniffs the real format, so a
     * mislabelled extension still works.
     *
     * @return array<int, array{name: string, phone_number: ?string, whatsapp_number: ?string, email: ?string}>
     */
    private function parse(UploadedFile $file): array
    {
        $sheet = IOFactory::load($file->getRealPath())->getActiveSheet()->toArray(null, true, false, false);

        if (empty($sheet)) {
            return [];
        }

        $map = $this->headerMap($sheet[0] ?? []);
        // No recognisable headings? Treat the sheet as bare columns in the
        // order asked for: surname, firstname, othernames, phone, LGA.
        $positional = $map === [];
        $body       = $positional ? $sheet : array_slice($sheet, 1);

        if ($positional) {
            $map = ['surname' => 0, 'firstname' => 1, 'othernames' => 2, 'phone_number' => 3, 'lga' => 4];
        }

        $rows = [];

        foreach ($body as $line) {
            $surname   = $this->cell($line, $map['surname'] ?? null);
            $firstname = $this->cell($line, $map['firstname'] ?? null);

            if ($surname === '' && $firstname === '') {
                continue;
            }

            $rows[] = [
                'surname'      => $surname,
                'firstname'    => $firstname,
                'othernames'   => $this->cell($line, $map['othernames'] ?? null),
                'lga'          => $this->cell($line, $map['lga'] ?? null),
                'phone_number' => $this->phone($this->cell($line, $map['phone_number'] ?? null)),
            ];
        }

        return $rows;
    }

    /**
     * @return array<string, int> field name => column index
     */
    private function headerMap(array $header): array
    {
        $map = [];

        foreach ($header as $index => $heading) {
            $normalised = preg_replace('/[^a-z]/', '', strtolower((string) $heading));

            if ($normalised === '') {
                continue;
            }

            foreach (self::HEADER_ALIASES as $field => $aliases) {
                if (isset($map[$field])) {
                    continue;
                }

                if (in_array($normalised, array_map(fn ($a) => preg_replace('/[^a-z]/', '', $a), $aliases), true)) {
                    $map[$field] = $index;
                }
            }
        }

        // A sheet with only, say, an LGA column isn't an attendance list.
        return isset($map['surname']) || isset($map['firstname']) ? $map : [];
    }

    /**
     * Matches a written LGA against Osun's, ignoring case, punctuation and
     * spacing ("ede-north", "EDE NORTH", "Ede North" are one place). An
     * unrecognised name is kept exactly as typed rather than dropped, so the
     * row still imports and can be corrected later.
     *
     * @return array{0: ?int, 1: string} [lga_id, name to store]
     */
    private function resolveLga(string $written): array
    {
        static $lgas = null;

        if ($lgas === null) {
            $stateId = State::where('name', 'like', '%' . self::STATE_NAME . '%')->value('id');

            $lgas = $stateId
                ? Lga::where('state_id', $stateId)->get(['id', 'name'])
                    ->mapWithKeys(fn ($lga) => [preg_replace('/[^a-z]/', '', strtolower($lga->name)) => $lga])
                    ->all()
                : [];
        }

        $key = preg_replace('/[^a-z]/', '', strtolower($written));

        if (isset($lgas[$key])) {
            return [$lgas[$key]->id, $lgas[$key]->name];
        }

        return [null, trim($written)];
    }

    private function cell(array $line, ?int $index): string
    {
        if ($index === null) {
            return '';
        }

        return trim((string) ($line[$index] ?? ''));
    }

    /**
     * Normalises to the local 0-prefixed form so the same person written three
     * different ways (+234 809…, 234809…, 8095…) lands on one number — which
     * is what re-import matching depends on. Spreadsheets also store
     * 08012345678 as the number 8012345678, dropping the leading zero.
     */
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
