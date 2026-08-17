<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Finds accounts that have been paid more than once.
 *
 * Each payment table already guarantees one payment per row — apo_payments and
 * po_payments enforce it with a unique paid_key. What none of them can see is
 * the same PERSON appearing in more than one pool: an APO officer who is also
 * on the standalone roster, or in a bulk transfer batch, is a different row in
 * a different table and every guard passes. This page looks across all of them
 * at once, keyed on the only thing that reliably identifies a payee — the bank
 * account the money landed in.
 */
class DuplicatePaymentController extends Controller
{
    /**
     * Every table that pays a bank account, with the label to show for it.
     * 'live' marks tables where a null paid_key means the attempt was released
     * and no money moved.
     */
    private const SOURCES = [
        'apo_payments'                   => ['label' => 'APO accreditation', 'live' => true],
        'po_payments'                    => ['label' => 'APO/PO check-in',   'live' => true],
        'bulk_transfer_payments'         => ['label' => 'Bulk transfer',     'live' => true],
        'accreditation_payments'         => ['label' => 'Applicant accreditation', 'live' => false],
        'applicant_payments'             => ['label' => 'Applicant payment', 'live' => false],
        'party_agent_payments'           => ['label' => 'Party agent',       'live' => false],
        'databoy_payments'               => ['label' => 'Databoy payment',   'live' => false],
        'databoy_accreditation_payments' => ['label' => 'Databoy accreditation', 'live' => false],
    ];

    public function index(Request $request)
    {
        // 'success' only counts money that certainly landed; 'all' also counts
        // pending and unknown, which is what you want before sending more —
        // an unresolved transfer may yet succeed.
        $scope = $request->query('scope') === 'all' ? 'all' : 'success';

        $payments = $this->allPayments($scope);

        // Group on the account number, since a name can be spelled differently
        // in two rosters while the account is the same money.
        $duplicates = $payments
            ->filter(fn ($p) => filled($p->account_number))
            ->groupBy('account_number')
            ->filter(fn ($group) => $group->count() > 1)
            ->map(fn ($group, $account) => [
                'account_number' => $account,
                'times_paid'     => $group->count(),
                'total'          => (float) $group->sum('amount'),
                'names'          => $group->pluck('account_name')->filter()->unique()->values(),
                'across_pools'   => $group->pluck('source')->unique()->count(),
                // The strong signal. Two payments from DIFFERENT pools are
                // often legitimate — an applicant can be owed both an
                // accreditation payment and a regular applicant payment, and
                // the codebase treats those as separate entitlements on
                // purpose. The same pool paying twice is the actual anomaly.
                'repeated_pools' => $group->countBy('source')
                    ->filter(fn ($count) => $count > 1)
                    ->map(fn ($count, $source) => ['pool' => $source, 'times' => $count])
                    ->values(),
                'payments'       => $group->sortBy('created_at')->map(fn ($p) => [
                    'source'     => $p->source,
                    'amount'     => (float) $p->amount,
                    'status'     => $p->status,
                    'name'       => $p->account_name,
                    'bank_name'  => $p->bank_name,
                    'reference'  => $p->reference,
                    'created_at' => $p->created_at,
                ])->values(),
            ])
            // Same-pool repeats first — those are the real anomalies — then by
            // the amount at stake.
            ->sortByDesc(fn ($d) => [count($d['repeated_pools']) > 0 ? 1 : 0, $d['total']])
            ->values();

        return inertia('Admin/DuplicatePayments', [
            'duplicates' => $duplicates,
            'scope'      => $scope,
            'stats'      => [
                'payments_scanned' => $payments->count(),
                'accounts'         => $payments->pluck('account_number')->filter()->unique()->count(),
                'duplicate_accounts' => $duplicates->count(),
                // Accounts paid twice by the SAME pool — the ones that should
                // not be possible and are worth investigating first.
                'same_pool'        => $duplicates->filter(fn ($d) => count($d['repeated_pools']) > 0)->count(),
                // Money paid by a pool that had already paid that account. Only
                // counts same-pool repeats, since cross-pool payments are
                // frequently separate entitlements rather than mistakes.
                'exposure'         => $duplicates->sum(function ($d) {
                    $extra = 0;

                    foreach ($d['repeated_pools'] as $repeat) {
                        $inPool = collect($d['payments'])->where('source', $repeat['pool'])->values();
                        $extra += $inPool->skip(1)->sum('amount');
                    }

                    return $extra;
                }),
                'cross_pool'       => $duplicates->where('across_pools', '>', 1)->count(),
            ],
        ]);
    }

    /**
     * One flat collection of payments from every pool.
     *
     * Built with a UNION so the database does the work in a single round trip
     * rather than loading eight tables into PHP.
     */
    private function allPayments(string $scope)
    {
        $query = null;

        foreach (self::SOURCES as $table => $meta) {
            $part = DB::table($table)
                ->selectRaw("? AS source, account_number, account_name, bank_name, amount, status, reference, created_at", [$meta['label']])
                ->when($scope === 'success', fn ($q) => $q->where('status', 'success'))
                ->when($scope === 'all', fn ($q) => $q->whereIn('status', ['success', 'pending', 'unknown']))
                // A released claim means the transfer was rejected outright and
                // no money moved, so it is not a payment for this purpose.
                ->when($meta['live'], fn ($q) => $q->whereNotNull('paid_key'));

            $query = $query ? $query->unionAll($part) : $part;
        }

        return collect(DB::query()->fromSub($query, 'p')->orderBy('created_at')->get());
    }
}
