<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\CreateApplicantRecipientJob;
use App\Models\ApoOfficer;

/**
 * Transfer recipients for qualified APO officers.
 *
 * An APO officer is an applicant, so the recipient lives in the existing
 * databoy_applicant_recipients table keyed by application — one Paystack
 * recipient per bank account, reused whichever pool pays them. Creating a
 * second recipient for the same account would be rejected by Paystack as a
 * duplicate anyway.
 */
class ApoRecipientController extends Controller
{
    public function index()
    {
        $officers = $this->officersQuery()
            ->get()
            ->sortBy(fn ($officer) => $officer->application->full_name ?? '')
            ->values()
            ->map(fn ($officer) => [
                'id'                   => $officer->id,
                'full_name'            => $officer->application->full_name ?? '—',
                'calling_phone_number' => $officer->application->calling_phone_number ?? '—',
                'lga'                  => $officer->application->lga->name ?? '—',
                'bank_name'            => $officer->application->bank_name,
                'account_number'       => $officer->application->account_number,
                'bank_account_name'    => $officer->application->bank_account_name,
                'recipient_status'     => $officer->application->recipient->status ?? null,
                'recipient_message'    => $officer->application->recipient->message ?? null,
            ]);

        return inertia('Admin/ApoRecipients', [
            'officers' => $officers,
            'stats'    => [
                'total'   => $officers->count(),
                'ready'   => $officers->where('recipient_status', 'success')->count(),
                'failed'  => $officers->where('recipient_status', 'failed')->count(),
                'pending' => $officers->whereNull('recipient_status')->count(),
            ],
        ]);
    }

    public function create()
    {
        $ids = $this->officersQuery()
            ->get()
            ->filter(fn ($officer) => ($officer->application->recipient->status ?? null) !== 'success')
            ->pluck('application.id')
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return back()->with('error', 'Every qualified APO officer already has a transfer recipient.');
        }

        foreach ($ids as $id) {
            CreateApplicantRecipientJob::dispatch($id);
        }

        return back()->with('success', "Queued recipient creation for {$ids->count()} APO officer(s). Refresh shortly to see progress.");
    }

    /**
     * Only officers with bank details on file — the rest cannot be paid and
     * would just queue jobs that fail.
     */
    private function officersQuery()
    {
        return ApoOfficer::with([
            'application:id,full_name,calling_phone_number,lga_id,bank_name,bank_code,account_number,bank_account_name',
            'application.lga:id,name',
            'application.recipient',
        ])->whereHas('application', fn ($q) => $q
            ->whereNotNull('bank_code')->where('bank_code', '!=', '')
            ->whereNotNull('account_number')->where('account_number', '!=', ''));
    }
}
