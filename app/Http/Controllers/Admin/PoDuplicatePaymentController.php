<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PoPayment;
use Illuminate\Support\Facades\DB;

/**
 * Finds APO/PO officers who were paid more than once.
 *
 * What the schema already makes impossible: paying one roster row twice
 * (po_payments.paid_key is unique) and two rows sharing an account number
 * (unique on po_officers). What it cannot stop is the same PERSON appearing as
 * two roster rows — a different account number, or a slightly different
 * spelling — checking in twice and collecting twice.
 *
 * So this looks for one human paid under several rows, matched on name, then
 * phone, then account. Only live payments count; a failed attempt is not money.
 */
class PoDuplicatePaymentController extends Controller
{
    public function index()
    {
        return inertia('Admin/PoDuplicatePayments', [
            'groups' => [
                'name'    => $this->duplicatesBy($this->nameKey(), 'name'),
                'phone'   => $this->duplicatesBy('o.phone_number', 'phone number'),
                'account' => $this->duplicatesBy('p.account_number', 'account number'),
            ],
            'pending' => $this->pending(),
            'stats'   => $this->stats(),
        ]);
    }

    /**
     * Transfers still settling, with a warning where the same person already
     * has a successful payment — those become duplicates the moment they land,
     * which is the only chance to stop one before the money is gone.
     */
    private function pending(): array
    {
        $rows = DB::table('po_payments as p')
            ->join('po_officers as o', 'o.id', '=', 'p.po_officer_id')
            ->whereIn('p.status', ['pending', 'unknown'])
            ->selectRaw($this->nameKey() . ' AS name_key')
            ->addSelect([
                'p.id as payment_id', 'p.amount', 'p.status', 'p.reference', 'p.created_at',
                'p.account_number as paid_account', 'p.bank_name', 'p.transfer_code',
                'o.id as officer_id', 'o.final_surname', 'o.final_first_name', 'o.final_other_name',
                'o.phone_number', 'o.final_lga', 'o.final_role', 'o.checked_in_at',
            ])
            ->orderBy('p.created_at')
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        // Names that already hold a settled payment.
        $alreadyPaid = DB::table('po_payments as p')
            ->join('po_officers as o', 'o.id', '=', 'p.po_officer_id')
            ->where('p.status', 'success')
            ->whereIn(DB::raw($this->nameKey()), $rows->pluck('name_key')->all())
            ->selectRaw($this->nameKey() . ' AS name_key')
            ->pluck('name_key')
            ->flip();

        return $rows->map(fn ($r) => [
            'payment_id'    => $r->payment_id,
            'officer_id'    => $r->officer_id,
            'full_name'     => trim(preg_replace('/\s+/', ' ', "{$r->final_surname} {$r->final_first_name} {$r->final_other_name}")),
            'phone_number'  => $r->phone_number,
            'lga'           => $r->final_lga,
            'role'          => $r->final_role,
            'bank_name'     => $r->bank_name,
            'paid_account'  => $r->paid_account,
            'amount'        => (float) $r->amount,
            'status'        => $r->status,
            'reference'     => $r->reference,
            'transfer_code' => $r->transfer_code,
            'checked_in_at' => $r->checked_in_at,
            'paid_at'       => $r->created_at,
            // The dangerous ones: settling on top of money already received.
            'would_duplicate' => $alreadyPaid->has($r->name_key),
        ])->values()->all();
    }

    /**
     * Name reduced to letters only, so "ADEYEMI Bolanle", "Adeyemi  bolanle"
     * and "Adeyemi-Bolanle" are recognised as one person.
     *
     * Nested REPLACE rather than REGEXP_REPLACE: that function only exists from
     * MySQL 8, and this has to run on the shared host too.
     */
    private function nameKey(): string
    {
        $concat = "CONCAT(o.final_surname, o.final_first_name, IFNULL(o.final_other_name, ''))";

        return "LOWER(REPLACE(REPLACE(REPLACE(REPLACE({$concat}, ' ', ''), '-', ''), '.', ''), '''', ''))";
    }

    /**
     * Groups of live payments sharing one key, with every payment in the group
     * so the extra ones can be identified and acted on.
     */
    private function duplicatesBy(string $keyExpression, string $label): array
    {
        // Which keys are duplicated — one grouped query, not a scan in PHP.
        $keys = DB::table('po_payments as p')
            ->join('po_officers as o', 'o.id', '=', 'p.po_officer_id')
            // Only settled money. A pending or unknown transfer may still fail,
            // so counting it as a duplicate would raise a false alarm.
            ->where('p.status', 'success')
            ->when($keyExpression !== 'o.phone_number', fn ($q) => $q, fn ($q) => $q->whereNotNull('o.phone_number')->where('o.phone_number', '!=', ''))
            ->selectRaw("{$keyExpression} AS group_key, COUNT(*) AS payments, SUM(p.amount) AS total")
            ->groupBy(DB::raw($keyExpression))
            ->havingRaw('COUNT(*) > 1')
            ->orderByDesc('total')
            ->get();

        if ($keys->isEmpty()) {
            return [];
        }

        // Then the rows behind those keys only.
        $rows = DB::table('po_payments as p')
            ->join('po_officers as o', 'o.id', '=', 'p.po_officer_id')
            // Only settled money. A pending or unknown transfer may still fail,
            // so counting it as a duplicate would raise a false alarm.
            ->where('p.status', 'success')
            ->whereIn(DB::raw($keyExpression), $keys->pluck('group_key')->all())
            ->selectRaw("{$keyExpression} AS group_key")
            ->addSelect([
                'p.id as payment_id', 'p.amount', 'p.status', 'p.reference', 'p.created_at',
                'p.account_number as paid_account', 'p.bank_name',
                'o.id as officer_id', 'o.final_surname', 'o.final_first_name', 'o.final_other_name',
                'o.phone_number', 'o.final_lga', 'o.final_ra_ward', 'o.final_pu', 'o.final_role',
                'o.checked_in_at',
            ])
            ->orderBy('p.created_at')
            ->get()
            ->groupBy('group_key');

        return $keys->map(fn ($key) => [
            'label'    => $label,
            'key'      => $key->group_key,
            'payments' => (int) $key->payments,
            'total'    => (float) $key->total,
            // Everything after the first payment is the overpayment.
            'excess'   => (float) $key->total - (float) ($rows[$key->group_key][0]->amount ?? 0),
            'rows'     => $rows[$key->group_key]->map(fn ($r) => [
                'payment_id'    => $r->payment_id,
                'officer_id'    => $r->officer_id,
                'full_name'     => trim(preg_replace('/\s+/', ' ', "{$r->final_surname} {$r->final_first_name} {$r->final_other_name}")),
                'phone_number'  => $r->phone_number,
                'paid_account'  => $r->paid_account,
                'bank_name'     => $r->bank_name,
                'lga'           => $r->final_lga,
                'ward'          => $r->final_ra_ward,
                'pu'            => $r->final_pu,
                'role'          => $r->final_role,
                'amount'        => (float) $r->amount,
                'status'        => $r->status,
                'reference'     => $r->reference,
                'checked_in_at' => $r->checked_in_at,
                'paid_at'       => $r->created_at,
            ])->values(),
        ])->values()->all();
    }

    private function stats(): array
    {
        $successful = PoPayment::where('status', 'success');

        return [
            'live_payments' => (clone $successful)->count(),
            'total_paid'    => (float) (clone $successful)->sum('amount'),
            // Shown so a low duplicate count isn't mistaken for a clean bill
            // while transfers are still settling.
            'unsettled'     => PoPayment::whereNotNull('paid_key')->whereIn('status', ['pending', 'unknown'])->count(),
        ];
    }

    /**
     * CSV of every duplicate group, for working through offline or handing to
     * whoever has to recover the money.
     */
    public function export()
    {
        $csv = "Matched On,Group Key,Full Name,Phone,LGA,Ward,Polling Unit,Role,Bank,Account Number,Amount,Status,Reference,Checked In,Paid At\n";

        foreach (['name' => $this->nameKey(), 'phone' => 'o.phone_number', 'account' => 'p.account_number'] as $label => $expression) {
            foreach ($this->duplicatesBy($expression, $label) as $group) {
                foreach ($group['rows'] as $row) {
                    $csv .= implode(',', array_map(
                        fn ($v) => '"' . str_replace('"', '""', (string) $v) . '"',
                        [
                            $label, $group['key'], $row['full_name'], $row['phone_number'], $row['lga'],
                            $row['ward'], $row['pu'], $row['role'], $row['bank_name'], $row['paid_account'],
                            $row['amount'], $row['status'], $row['reference'], $row['checked_in_at'], $row['paid_at'],
                        ]
                    )) . "\n";
                }
            }
        }

        return response($csv, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="apo-po-duplicate-payments.csv"',
        ]);
    }
}
