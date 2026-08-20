<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\PayDataboyCompensationJob;
use App\Models\Databoy;
use App\Models\DataboyCompensation;
use App\Models\DataboyCompensationPayment;
use App\Models\Lga;
use App\Models\State;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Databoy compensation: upload a list of names and LGAs, match each to a real
 * databoy, approve with an amount, then pay.
 *
 * The matching is a suggestion, never a decision — names on these sheets are
 * spelled loosely and two databoys in one LGA can share a name, so a person
 * confirms each one before any money is attached to it.
 */
class DataboyCompensationController extends Controller
{
    private const HEADER_ALIASES = [
        'name' => ['databoyname', 'name', 'fullname', 'databoy'],
        'lga'  => ['lga', 'localgovernment', 'localgovernmentarea', 'lganame'],
    ];

    private const STATE_NAME = 'Osun';

    public function index(Request $request)
    {
        $status = $request->query('status', 'pending');

        $rows = DataboyCompensation::with(['databoy:id,full_name,calling_phone_number,lga_id', 'databoy.lga:id,name', 'lga:id,name'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderBy('uploaded_lga')->orderBy('uploaded_name')
            ->get()
            ->map(fn ($row) => [
                'id'            => $row->id,
                'uploaded_name' => $row->uploaded_name,
                'uploaded_lga'  => $row->uploaded_lga,
                'lga'           => $row->lga->name ?? null,
                'lga_id'        => $row->lga_id,
                'status'        => $row->status,
                'amount'        => $row->amount ? (float) $row->amount : null,
                'note'          => $row->note,
                'matched'       => $row->databoy ? [
                    'id'    => $row->databoy->id,
                    'name'  => $row->databoy->full_name,
                    'phone' => $row->databoy->calling_phone_number,
                ] : null,
                // Only computed for rows still awaiting a decision.
                'candidates'    => $row->status === 'pending' ? $this->candidatesFor($row) : [],
            ]);

        return inertia('Admin/DataboyCompensations', [
            'rows'   => $rows,
            'status' => $status,
            'counts' => [
                'pending'  => DataboyCompensation::where('status', 'pending')->count(),
                'approved' => DataboyCompensation::where('status', 'approved')->count(),
                'rejected' => DataboyCompensation::where('status', 'rejected')->count(),
                'all'      => DataboyCompensation::count(),
            ],
        ]);
    }

    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file|max:20480']);

        try {
            $parsed = $this->parse($request->file('file'));
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => 'Could not read that file: ' . $e->getMessage()]);
        }

        if (empty($parsed)) {
            return back()->withErrors(['file' => 'No usable rows found. The sheet needs a Databoy Name column and an LGA column.']);
        }

        $created = 0;
        $skipped = 0;

        foreach ($parsed as $row) {
            if ($row['name'] === '' || $row['lga'] === '') {
                $skipped++;
                continue;
            }

            [$lgaId, $lgaName] = $this->resolveLga($row['lga']);

            DataboyCompensation::create([
                'uploaded_name' => $row['name'],
                'uploaded_lga'  => $lgaName,
                'lga_id'        => $lgaId,
                'status'        => 'pending',
            ]);

            $created++;
        }

        $message = "Uploaded {$created} name(s) for review.";

        if ($skipped) {
            $message .= " {$skipped} row(s) skipped — a name and an LGA are both required.";
        }

        return back()->with('success', $message);
    }

    /**
     * Databoys in the same LGA whose name resembles the uploaded one, best
     * first. Nothing is auto-selected: the list is for a person to choose from.
     */
    private function candidatesFor(DataboyCompensation $row): array
    {
        $needle = $this->nameKey($row->uploaded_name);

        $databoys = Databoy::query()
            // Scoped to the LGA on the sheet; without one there is nothing to
            // narrow by and the whole roster would be a meaningless list.
            ->when($row->lga_id, fn ($q) => $q->where('lga_id', $row->lga_id), fn ($q) => $q->whereRaw('1 = 0'))
            ->with('lga:id,name')
            ->get(['id', 'full_name', 'calling_phone_number', 'lga_id']);

        return $databoys
            ->map(function ($databoy) use ($needle) {
                $candidate = $this->nameKey($databoy->full_name);

                // similar_text gives a percentage that copes with reordered or
                // partially-spelled names better than an exact comparison.
                similar_text($needle, $candidate, $percent);

                return [
                    'id'     => $databoy->id,
                    'name'   => $databoy->full_name,
                    'phone'  => $databoy->calling_phone_number,
                    'score'  => round($percent),
                    'exact'  => $candidate === $needle,
                ];
            })
            // Below half the letters in common it is not a near-miss, it is a
            // different person.
            ->filter(fn ($c) => $c['score'] >= 50 || $c['exact'])
            ->sortByDesc('score')
            ->take(6)
            ->values()
            ->all();
    }

    /**
     * Attach a databoy and an amount. Refuses where the databoy has no working
     * transfer recipient, since an approval that cannot be paid is not an
     * approval.
     */
    public function approve(Request $request, DataboyCompensation $compensation)
    {
        $validated = $request->validate([
            'databoy_id' => 'required|exists:databoys,id',
            'amount'     => 'required|numeric|min:1',
            'note'       => 'nullable|string|max:255',
        ]);

        $databoy = Databoy::with('accreditationRecipient')->find($validated['databoy_id']);
        $recipient = $databoy->accreditationRecipient;

        if (!$recipient || $recipient->status !== 'success' || !$recipient->recipient_code) {
            return back()->with('error', "{$databoy->full_name} has no transfer recipient yet — create one before approving this compensation.");
        }

        // The same databoy must not be compensated twice off one upload.
        $existing = DataboyCompensation::where('databoy_id', $databoy->id)
            ->where('id', '!=', $compensation->id)
            ->whereIn('status', ['approved'])
            ->exists();

        if ($existing) {
            return back()->with('error', "{$databoy->full_name} is already approved for compensation on another row.");
        }

        $compensation->update([
            'databoy_id'  => $databoy->id,
            'amount'      => $validated['amount'],
            'note'        => $validated['note'] ?? null,
            'status'      => 'approved',
            'approved_at' => now(),
        ]);

        return back()->with('success', "{$compensation->uploaded_name} approved as {$databoy->full_name} for ₦" . number_format($validated['amount'], 2) . '.');
    }

    public function reject(DataboyCompensation $compensation)
    {
        $compensation->update(['status' => 'rejected', 'databoy_id' => null, 'amount' => null]);

        return back()->with('success', "{$compensation->uploaded_name} rejected.");
    }

    /** Back to the review queue, as long as no money has gone out. */
    public function reopen(DataboyCompensation $compensation)
    {
        if ($compensation->hasLivePayment()) {
            return back()->with('error', "{$compensation->uploaded_name} has a payment on record and cannot be reopened.");
        }

        $compensation->update(['status' => 'pending', 'databoy_id' => null, 'amount' => null, 'approved_at' => null]);

        return back()->with('success', "{$compensation->uploaded_name} sent back for review.");
    }

    public function destroy(DataboyCompensation $compensation)
    {
        if ($compensation->hasLivePayment()) {
            return back()->with('error', "{$compensation->uploaded_name} has a payment on record and cannot be deleted.");
        }

        $name = $compensation->uploaded_name;
        $compensation->delete();

        return back()->with('success', "{$name} removed.");
    }

    // ── Awaiting payment ────────────────────────────────────────────────────

    public function awaiting()
    {
        $rows = DataboyCompensation::with([
                'databoy:id,full_name,calling_phone_number',
                'databoy.accreditationRecipient',
                'latestPayment',
            ])
            ->where('status', 'approved')
            ->orderBy('uploaded_lga')->orderBy('uploaded_name')
            ->get()
            ->map(function ($row) {
                $recipient = $row->databoy?->accreditationRecipient;
                $payment   = $row->latestPayment;

                return [
                    'id'             => $row->id,
                    'uploaded_name'  => $row->uploaded_name,
                    'lga'            => $row->uploaded_lga,
                    'databoy_name'   => $row->databoy->full_name ?? '—',
                    'phone'          => $row->databoy->calling_phone_number ?? null,
                    'amount'         => (float) $row->amount,
                    'bank_name'      => $recipient->bank_name ?? null,
                    'account_number' => $recipient->account_number ?? null,
                    'account_name'   => $recipient->account_name ?? null,
                    'ready'          => $recipient && $recipient->status === 'success' && $recipient->recipient_code,
                    'payment_status' => $payment?->status,
                    'payment_message' => $payment?->message,
                    'paid'           => (bool) $row->payments()->whereNotNull('paid_key')->exists(),
                    'note'           => $row->note,
                ];
            });

        return inertia('Admin/AwaitingCompensationPayment', [
            'rows'  => $rows,
            'stats' => [
                'total'       => $rows->count(),
                'payable'     => $rows->where('paid', false)->where('ready', true)->count(),
                'paid'        => $rows->where('paid', true)->count(),
                'not_ready'   => $rows->where('ready', false)->count(),
                'to_pay'      => (float) $rows->where('paid', false)->where('ready', true)->sum('amount'),
                'paid_amount' => (float) DataboyCompensationPayment::where('status', 'success')->sum('amount'),
            ],
        ]);
    }

    public function payAll()
    {
        $rows = DataboyCompensation::awaitingPayment()
            ->whereHas('databoy.accreditationRecipient', fn ($q) => $q->where('status', 'success'))
            ->get();

        if ($rows->isEmpty()) {
            return back()->with('error', 'Nothing is payable — everyone approved is either already paid or has no transfer recipient.');
        }

        // Queued individually, not chained: a broken chain would leave most of
        // the list unpaid. Each job claims a unique key before transferring, so
        // nobody can be paid twice however these are scheduled.
        $rows->each(fn ($row) => PayDataboyCompensationJob::dispatch($row->id));

        return back()->with('success', "Queued {$rows->count()} compensation payment(s) totalling ₦" . number_format($rows->sum('amount'), 2) . '.');
    }

    public function pay(DataboyCompensation $compensation)
    {
        if ($compensation->hasLivePayment()) {
            return back()->with('error', "{$compensation->uploaded_name} already has a payment on record.");
        }

        if ($compensation->status !== 'approved') {
            return back()->with('error', "{$compensation->uploaded_name} has not been approved.");
        }

        PayDataboyCompensationJob::dispatch($compensation->id);

        return back()->with('success', "Queued payment for {$compensation->uploaded_name}.");
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Letters only, so spacing, case and punctuation don't defeat a match. */
    private function nameKey(?string $name): string
    {
        return preg_replace('/[^a-z]/', '', strtolower((string) $name));
    }

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

        // Unrecognised LGA is kept as written — the row still imports, it just
        // has no roster to match against until the name is corrected.
        return [null, trim($written)];
    }

    /**
     * @return array<int, array{name: string, lga: string}>
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

                if (in_array($normalised, array_map(fn ($a) => preg_replace('/[^a-z]/', '', $a), $aliases), true)) {
                    $map[$field] = $index;
                }
            }
        }

        // No recognisable headings — fall back to the documented order.
        $positional = !isset($map['name']);
        $body       = $positional ? $sheet : array_slice($sheet, 1);

        if ($positional) {
            $map = ['name' => 0, 'lga' => 1];
        }

        $rows = [];

        foreach ($body as $line) {
            $name = trim((string) ($line[$map['name'] ?? 0] ?? ''));
            $lga  = trim((string) ($line[$map['lga'] ?? 1] ?? ''));

            if ($name === '' && $lga === '') {
                continue;
            }

            $rows[] = ['name' => $name, 'lga' => $lga];
        }

        return $rows;
    }
}
