<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ApoOfficersExport;
use App\Http\Controllers\Controller;
use App\Models\ApoOfficer;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ApoOfficerController extends Controller
{
    public function index()
    {
        return inertia('Admin/ApoOfficers', [
            'officers' => $this->officerList(),
        ]);
    }

    public function exportExcel(Request $request)
    {
        $status   = $request->get('status', 'all');
        $from     = $request->get('from');
        $to       = $request->get('to');
        $officers = $this->officerList();

        if ($status === 'replaced') {
            $officers = $officers->where('is_replaced', true);

            if ($from) {
                $officers = $officers->filter(fn ($o) => $o['replaced_at'] && $o['replaced_at']->toDateString() >= $from);
            }
            if ($to) {
                $officers = $officers->filter(fn ($o) => $o['replaced_at'] && $o['replaced_at']->toDateString() <= $to);
            }

            $officers = $officers->values();
        } elseif ($status === 'original') {
            $officers = $officers->where('is_replaced', false)->values();
        }

        return Excel::download(new ApoOfficersExport($officers), "apo_officers_{$status}.xlsx");
    }

    private function officerList()
    {
        return ApoOfficer::with([
                'application:id,full_name,calling_phone_number,email_address,lga_id,ward_id,registered_by,created_at,updated_at',
                'application.lga:id,name',
                'application.ward:id,name',
                'application.databoy:id,full_name',
            ])
            ->latest()
            ->get()
            ->map(function ($officer) {
                $application = $officer->application;

                // "Replaced" is read straight off the databoy_applications
                // row's updated_at column — see DataboyApplication::wasReplaced().
                $isReplaced = $application && $application->wasReplaced();

                return [
                    'id'                 => $officer->id,
                    'full_name'          => $application->full_name ?? '—',
                    'previous_full_name' => $officer->previous_full_name,
                    'is_replaced'        => $isReplaced,
                    'replaced_at'        => $isReplaced ? $application->replacedAt() : null,
                    'phone_number'       => $application->calling_phone_number ?? '—',
                    'email'              => $application->email_address ?? '—',
                    'lga'                => $application->lga->name ?? '—',
                    'ward'               => $application->ward->name ?? '—',
                    'registered_by'      => $application->databoy->full_name ?? '—',
                    'qualified_at'       => $officer->created_at,
                ];
            });
    }
}
