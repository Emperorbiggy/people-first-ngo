<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Databoy;
use App\Models\Lga;
use App\Models\Ward;
use Illuminate\Http\Request;

class DataboyController extends Controller
{
    public function index()
    {
        $registeredWardIds = Databoy::whereNotNull('ward_id')->pluck('ward_id');

        $stats = [
            'total' => Databoy::count(),
            'lgas'  => Databoy::whereNotNull('lga_id')->distinct('lga_id')->count('lga_id'),
            'wards' => $registeredWardIds->count(),
        ];

        $lgaCoverage = Lga::withCount([
            'wards',
            'wards as registered_count' => fn ($q) => $q->whereIn('id', $registeredWardIds),
        ])->orderBy('name')->get(['id', 'name']);

        $databoys = Databoy::with(['lga:id,name', 'ward:id,name'])
            ->latest()
            ->get(['id', 'full_name', 'login_email', 'login_password_plain', 'calling_phone_number', 'is_active', 'lga_id', 'ward_id', 'created_at'])
            ->map(fn ($db) => [
                'id'                   => $db->id,
                'full_name'            => $db->full_name,
                'login_email'          => $db->login_email,
                'login_password_plain' => $db->getRawOriginal('login_password_plain'),
                'calling_phone_number' => $db->calling_phone_number,
                'is_active'            => $db->is_active,
                'lga_id'               => $db->lga_id,
                'ward_id'              => $db->ward_id,
                'lga'                  => $db->lga,
                'ward'                 => $db->ward,
                'created_at'           => $db->created_at,
            ]);

        $lgas = Lga::orderBy('name')->get(['id', 'name']);

        return inertia('Admin/Databoy', compact('stats', 'lgaCoverage', 'databoys', 'lgas'));
    }

    public function wardAssignments()
    {
        $databoys = Databoy::with(['lga:id,name', 'ward:id,name'])
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'lga_id', 'ward_id']);

        $lgas = Lga::orderBy('name')->get(['id', 'name']);

        return inertia('Admin/DataboyWardAssignment', compact('databoys', 'lgas'));
    }

    public function toggle(Databoy $databoy)
    {
        $databoy->update(['is_active' => !$databoy->is_active]);
        return back();
    }

    public function release(Databoy $databoy)
    {
        $databoy->update(['lga_id' => null, 'ward_id' => null]);
        return back()->with('success', "{$databoy->full_name}'s ward has been released.");
    }

    public function assign(Request $request, Databoy $databoy)
    {
        $request->validate([
            'lga_id'  => 'required|exists:lgas,id',
            'ward_id' => 'required|exists:wards,id',
        ]);

        // Ensure the ward isn't already taken by someone else
        $conflict = Databoy::where('ward_id', $request->ward_id)
            ->where('id', '!=', $databoy->id)
            ->exists();

        if ($conflict) {
            return back()->withErrors(['ward_id' => 'This ward is already assigned to another databoy.']);
        }

        $databoy->update([
            'lga_id'  => $request->lga_id,
            'ward_id' => $request->ward_id,
        ]);

        return back()->with('success', "Ward assigned to {$databoy->full_name}.");
    }

    public function availableWards(Request $request, Lga $lga)
    {
        $excludeDataboyId = $request->query('exclude');

        $takenWardIds = Databoy::whereNotNull('ward_id')
            ->when($excludeDataboyId, fn ($q) => $q->where('id', '!=', $excludeDataboyId))
            ->pluck('ward_id');

        $wards = Ward::where('lga_id', $lga->id)
            ->whereNotIn('id', $takenWardIds)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($wards);
    }
}
