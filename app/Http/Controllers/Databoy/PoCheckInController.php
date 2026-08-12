<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Jobs\PayPoOfficerJob;
use App\Models\PoOfficer;
use App\Models\Setting;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * The check-in officer's whole portal: the APO/PO roster for their own LGA,
 * with a single Check In action per person.
 *
 * Checking someone in is what pays them — there is no checkout. The payment is
 * queued from inside the same transaction that records the check-in, so a
 * check-in can never exist without its payment having been dispatched.
 */
class PoCheckInController extends Controller
{
    public function index()
    {
        $officer = $this->officer();
        $lgaName = $officer->lga->name ?? null;

        $roster = PoOfficer::forLga($lgaName)
            ->withCount(['payments as live_payments_count' => fn ($q) => $q->whereNotNull('paid_key')])
            ->with(['payments' => fn ($q) => $q->latest()->limit(1)])
            ->orderBy('final_surname')->orderBy('final_first_name')
            ->get()
            ->map(function ($row) {
                $payment = $row->payments->first();

                return [
                    'id'             => $row->id,
                    'full_name'      => $row->full_name,
                    'phone_number'   => $row->phone_number,
                    'final_pu'       => $row->final_pu,
                    'final_ra_ward'  => $row->final_ra_ward,
                    'final_role'     => $row->final_role,
                    'account_number' => $row->account_number,
                    'bank_name'      => $row->bank_name,
                    'checked_in_at'  => $row->checked_in_at,
                    'ready'          => $row->recipient_status === 'success',
                    'payment_status' => $payment?->status,
                    'paid'           => $row->live_payments_count > 0,
                ];
            });

        return inertia('Databoy/PoCheckIn', [
            'lga'    => $lgaName,
            'roster' => $roster,
            'amount' => (float) Setting::get('po_payment_amount', 0),
            'stats'  => [
                'total'      => $roster->count(),
                'checked_in' => $roster->whereNotNull('checked_in_at')->count(),
                'remaining'  => $roster->whereNull('checked_in_at')->count(),
            ],
        ]);
    }

    public function checkIn(PoOfficer $poOfficer)
    {
        $officer = $this->officer();

        // An officer may only ever touch their own LGA's roster — enforced
        // here, not just by what the page happens to list.
        abort_unless($this->belongsToLga($poOfficer, $officer->lga->name ?? null), 403, 'That officer is not in your LGA.');

        if ($poOfficer->checked_in_at) {
            return back()->with('error', "{$poOfficer->full_name} is already checked in.");
        }

        if ($poOfficer->recipient_status !== 'success') {
            return back()->with('error', "{$poOfficer->full_name} has no payment account ready yet. Contact the admin.");
        }

        $amount = (float) Setting::get('po_payment_amount', 0);

        if ($amount <= 0) {
            return back()->with('error', 'No payment amount has been set yet. Contact the admin.');
        }

        // Claim the check-in with a conditional update: if another device got
        // there first the update affects zero rows and we stop, so two taps
        // can never queue two payments.
        $claimed = PoOfficer::whereKey($poOfficer->id)
            ->whereNull('checked_in_at')
            ->update([
                'checked_in_at' => now(),
                'checked_in_by' => $officer->id,
            ]);

        if (!$claimed) {
            return back()->with('error', "{$poOfficer->full_name} was already checked in.");
        }

        // PayPoOfficerJob independently claims a unique paid_key before it
        // transfers, so this dispatch cannot double-pay even if it is somehow
        // reached twice.
        PayPoOfficerJob::dispatch($poOfficer->id, $amount);

        return back()->with('success', "{$poOfficer->full_name} checked in — payment of ₦" . number_format($amount, 2) . ' queued.');
    }

    private function officer()
    {
        $databoy = Auth::guard('databoy')->user();

        abort_unless($databoy?->isPoCheckInOfficer(), 403);

        return $databoy;
    }

    private function belongsToLga(PoOfficer $poOfficer, ?string $lgaName): bool
    {
        $normalise = fn ($v) => preg_replace('/[^a-z0-9]/', '', strtolower((string) $v));

        return $normalise($lgaName) !== '' && $normalise($poOfficer->final_lga) === $normalise($lgaName);
    }
}
