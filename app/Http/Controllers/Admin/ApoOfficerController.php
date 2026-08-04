<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ApoOfficersExport;
use App\Http\Controllers\Controller;
use App\Models\ApoOfficer;
use Maatwebsite\Excel\Facades\Excel;

class ApoOfficerController extends Controller
{
    public function index()
    {
        return inertia('Admin/ApoOfficers', [
            'officers' => $this->officerList(),
        ]);
    }

    public function exportExcel()
    {
        return Excel::download(new ApoOfficersExport($this->officerList()), 'apo_officers.xlsx');
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
                'id'            => $officer->id,
                'full_name'     => $officer->application->full_name ?? '—',
                'phone_number'  => $officer->application->calling_phone_number ?? '—',
                'email'         => $officer->application->email_address ?? '—',
                'lga'           => $officer->application->lga->name ?? '—',
                'ward'          => $officer->application->ward->name ?? '—',
                'registered_by' => $officer->application->databoy->full_name ?? '—',
                'qualified_at'  => $officer->created_at,
            ]);
    }
}
