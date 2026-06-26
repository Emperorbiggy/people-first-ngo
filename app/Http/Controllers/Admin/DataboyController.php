<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Databoy;
use App\Models\Lga;

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
            ->get(['id', 'full_name', 'login_email', 'calling_phone_number', 'lga_id', 'ward_id', 'created_at']);

        return inertia('Admin/Databoy', compact('stats', 'lgaCoverage', 'databoys'));
    }
}
