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
                'application:id,full_name,calling_phone_number,email_address,lga_id,ward_id,registered_by',
                'application.lga:id,name',
                'application.ward:id,name',
                'application.databoy:id,full_name',
            ])
            ->latest()
            ->get()
            ->map(fn ($officer) => [
                'id'                 => $officer->id,
                'full_name'          => $officer->application->full_name ?? '—',
                'previous_full_name' => $officer->previous_full_name,
                'is_replaced'        => (bool) $officer->replaced_at,
                'replaced_at'        => $officer->replaced_at,
                'phone_number'       => $officer->application->calling_phone_number ?? '—',
                'email'              => $officer->application->email_address ?? '—',
                'lga'                => $officer->application->lga->name ?? '—',
                'ward'               => $officer->application->ward->name ?? '—',
                'registered_by'      => $officer->application->databoy->full_name ?? '—',
                'qualified_at'       => $officer->created_at,
            ]);
    }
}
