<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Models\ApoOfficer;
use App\Models\DataboyApplication;
use Illuminate\Support\Facades\Auth;

class ApoOfficerController extends Controller
{
    public function index()
    {
        $databoy = Auth::guard('databoy')->user();

        $applications = DataboyApplication::where('registered_by', $databoy->id)
            ->with(['lga:id,name', 'ward:id,name', 'apoOfficer'])
            ->latest()
            ->get();

        return inertia('Databoy/ApoOfficers/Index', compact('applications'));
    }

    public function qualify(DataboyApplication $databoyApplication)
    {
        $databoy = Auth::guard('databoy')->user();
        abort_if($databoyApplication->registered_by !== $databoy->id, 403);

        if (ApoOfficer::where('databoy_application_id', $databoyApplication->id)->exists()) {
            return back()->with('error', "{$databoyApplication->full_name} is already qualified as an APO officer.");
        }

        ApoOfficer::create([
            'databoy_application_id' => $databoyApplication->id,
            'qualified_by'           => $databoy->id,
        ]);

        return back()->with('success', "{$databoyApplication->full_name} has been qualified as an APO officer.");
    }
}
