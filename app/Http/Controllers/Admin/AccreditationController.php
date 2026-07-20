<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataboyApplication;
use App\Models\Ward;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

    public function wardStats()
    {
        $counts = DataboyApplication::select(
                'ward_id',
                DB::raw('count(*) as total'),
                DB::raw('sum(case when is_accredited = 1 then 1 else 0 end) as accredited')
            )
            ->whereNotNull('ward_id')
            ->groupBy('ward_id')
            ->get()
            ->keyBy('ward_id');

        $wards = Ward::with('lga:id,name')
            ->whereIn('id', $counts->keys())
            ->orderBy('name')
            ->get(['id', 'name', 'lga_id'])
            ->map(function ($ward) use ($counts) {
                $c          = $counts[$ward->id];
                $total      = (int) $c->total;
                $accredited = (int) $c->accredited;

                return [
                    'id'               => $ward->id,
                    'name'             => $ward->name,
                    'lga'              => $ward->lga?->name,
                    'total_applicants' => $total,
                    'accredited'       => $accredited,
                    'pending'          => $total - $accredited,
                    'pct'              => $total > 0 ? round(($accredited / $total) * 100) : 0,
                ];
            })
            ->sortBy(['lga', 'name'])
            ->values();

        $summary = [
            'total_wards'      => $wards->count(),
            'total_applicants' => $wards->sum('total_applicants'),
            'total_accredited' => $wards->sum('accredited'),
            'overall_pct'      => $wards->sum('total_applicants') > 0
                ? round(($wards->sum('accredited') / $wards->sum('total_applicants')) * 100)
                : 0,
        ];

        return inertia('Admin/AccreditationWardStats', compact('wards', 'summary'));
    }

    public function checkedInStats()
    {
        $counts = DataboyApplication::select(
                'ward_id',
                DB::raw('count(*) as checked_in')
            )
            ->whereNotNull('ward_id')
            ->whereNotNull('checked_in_at')
            ->whereNull('checked_out_at')
            ->groupBy('ward_id')
            ->get()
            ->keyBy('ward_id');

        $wards = Ward::with('lga:id,name')
            ->whereIn('id', $counts->keys())
            ->orderBy('name')
            ->get(['id', 'name', 'lga_id'])
            ->map(fn ($ward) => [
                'id'          => $ward->id,
                'name'        => $ward->name,
                'lga'         => $ward->lga?->name,
                'checked_in'  => (int) $counts[$ward->id]->checked_in,
            ])
            ->sortBy(['lga', 'name'])
            ->values();

        $summary = [
            'total_wards'      => $wards->count(),
            'total_checked_in' => $wards->sum('checked_in'),
        ];

        return inertia('Admin/AccreditationCheckedInStats', compact('wards', 'summary'));
    }
}
