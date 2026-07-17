<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\CreateApplicantRecipientJob;
use App\Models\DataboyApplication;

class ApplicantRecipientController extends Controller
{
    public function index()
    {
        $applications = $this->eligibleApplicationsQuery()
            ->with('recipient')
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'calling_phone_number', 'bank_name', 'account_number', 'bank_account_name'])
            ->map(fn ($app) => [
                'id'                    => $app->id,
                'full_name'             => $app->full_name,
                'calling_phone_number'  => $app->calling_phone_number,
                'bank_name'             => $app->bank_name,
                'account_number'        => $app->account_number,
                'bank_account_name'     => $app->bank_account_name,
                'recipient_status'      => $app->recipient->status ?? null,
                'recipient_message'     => $app->recipient->message ?? null,
            ]);

        return inertia('Admin/ApplicantRecipients', [
            'applications' => $applications,
        ]);
    }

    public function create()
    {
        $ids = $this->eligibleApplicationsQuery()
            ->whereDoesntHave('recipient', fn ($q) => $q->where('status', 'success'))
            ->pluck('id');

        if ($ids->isEmpty()) {
            return back()->with('error', 'No applicants are pending recipient creation.');
        }

        foreach ($ids as $id) {
            CreateApplicantRecipientJob::dispatch($id);
        }

        return back()->with('success', "Queued recipient creation for {$ids->count()} applicant(s). Refresh shortly to see progress.");
    }

    private function eligibleApplicationsQuery()
    {
        return DataboyApplication::whereNotNull('bank_code')
            ->where('bank_code', '!=', '')
            ->whereNotNull('account_number')
            ->where('account_number', '!=', '');
    }
}
