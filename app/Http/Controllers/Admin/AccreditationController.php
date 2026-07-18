<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataboyApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AccreditationController extends Controller
{
    public function index()
    {
        $applications = DataboyApplication::with(['databoy:id,full_name', 'lga:id,name', 'ward:id,name'])
            ->orderBy('full_name')
            ->get([
                'id', 'full_name', 'calling_phone_number', 'registered_by', 'lga_id', 'ward_id',
                'passport_photograph_path', 'is_accredited', 'accredited_at',
            ]);

        return inertia('Admin/Accreditation', compact('applications'));
    }

    public function accredit(Request $request, DataboyApplication $databoyApplication)
    {
        $request->validate([
            'photo' => 'required|image|max:5120',
        ]);

        $oldPath = $databoyApplication->passport_photograph_path;

        $cleanName = strtolower(preg_replace('/\s+/', ' ', trim($databoyApplication->full_name)));
        $rand      = rand(1000, 9999);
        $filename  = "{$cleanName} {$rand} accreditation." . $request->file('photo')->getClientOriginalExtension();
        $newPath   = $request->file('photo')->storeAs('databoy-applications', $filename, 'public');

        $databoyApplication->update([
            'passport_photograph_path' => $newPath,
            'is_accredited'            => true,
            'accredited_at'            => now(),
            'accredited_by'            => $request->user()->id,
            'accredited_by_databoy_id' => null,
        ]);

        if ($oldPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        return back()->with('success', "{$databoyApplication->full_name} has been accredited.");
    }

    public function list()
    {
        $applications = DataboyApplication::with([
                'databoy:id,full_name',
                'lga:id,name',
                'ward:id,name',
                'accreditedBy:id,name',
                'accreditedByDataboy:id,full_name',
            ])
            ->where('is_accredited', true)
            ->orderByDesc('accredited_at')
            ->get([
                'id', 'full_name', 'calling_phone_number', 'registered_by', 'lga_id', 'ward_id',
                'passport_photograph_path', 'accredited_at', 'accredited_by', 'accredited_by_databoy_id',
            ])
            ->map(fn ($app) => [
                'id'                    => $app->id,
                'full_name'             => $app->full_name,
                'calling_phone_number'  => $app->calling_phone_number,
                'passport_photograph_path' => $app->passport_photograph_path,
                'accredited_at'         => $app->accredited_at,
                'databoy'               => $app->databoy,
                'lga'                   => $app->lga,
                'ward'                  => $app->ward,
                'accreditor_name'       => $app->accreditedBy->name ?? $app->accreditedByDataboy->full_name ?? '—',
                'accreditor_type'       => $app->accredited_by ? 'Admin' : ($app->accredited_by_databoy_id ? 'Databoy' : null),
            ]);

        return inertia('Admin/AccreditedList', compact('applications'));
    }
}
