<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Databoy;
use App\Models\Lga;
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
                'lga'                  => $db->lga,
                'ward'                 => $db->ward,
                'created_at'           => $db->created_at,
            ]);

        return inertia('Admin/Databoy', compact('stats', 'lgaCoverage', 'databoys'));
    }

    public function toggle(Databoy $databoy)
    {
        $databoy->update(['is_active' => !$databoy->is_active]);
        return back();
    }
}
