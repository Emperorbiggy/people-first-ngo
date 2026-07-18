<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\CreateAirtimeRecipientJob;
use App\Models\Databoy;

class AirtimeRecipientController extends Controller
{
    public function index()
    {
        $databoys = $this->eligibleDataboysQuery()
            ->with('airtimeRecipient')
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'browsing_network', 'browsing_number'])
            ->map(fn ($db) => [
                'id'                => $db->id,
                'full_name'         => $db->full_name,
                'browsing_network'  => $db->browsing_network,
                'browsing_number'   => $db->browsing_number,
                'recipient_status'  => $db->airtimeRecipient->status ?? null,
                'recipient_message' => $db->airtimeRecipient->message ?? null,
            ]);

        return inertia('Admin/AirtimeRecipients', [
            'databoys' => $databoys,
        ]);
    }

    public function create()
    {
        $ids = $this->eligibleDataboysQuery()
            ->whereDoesntHave('airtimeRecipient', fn ($q) => $q->where('status', 'success'))
            ->pluck('id');

        if ($ids->isEmpty()) {
            return back()->with('error', 'No databoys are pending recipient creation.');
        }

        foreach ($ids as $id) {
            CreateAirtimeRecipientJob::dispatch($id);
        }

        return back()->with('success', "Queued recipient creation for {$ids->count()} databoy(s). Refresh shortly to see progress.");
    }

    private function eligibleDataboysQuery()
    {
        return Databoy::whereNotNull('browsing_network')
            ->where('browsing_network', '!=', '')
            ->whereNotNull('browsing_number')
            ->where('browsing_number', '!=', '');
    }
}
