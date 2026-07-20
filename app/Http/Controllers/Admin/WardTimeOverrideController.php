<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ward;
use App\Models\WardTimeOverride;
use Illuminate\Http\Request;

class WardTimeOverrideController extends Controller
{
    public function index()
    {
        $today = now()->toDateString();

        $overrides = WardTimeOverride::whereDate('override_date', $today)->get()->keyBy('ward_id');

        $wards = Ward::with('lga:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'lga_id'])
            ->map(function ($ward) use ($overrides) {
                $override = $overrides->get($ward->id);

                return [
                    'id'       => $ward->id,
                    'name'     => $ward->name,
                    'lga'      => $ward->lga?->name,
                    'override' => $override ? [
                        'checkin_start'  => $override->checkin_start,
                        'checkin_end'    => $override->checkin_end,
                        'checkout_start' => $override->checkout_start,
                        'checkout_end'   => $override->checkout_end,
                    ] : null,
                ];
            })
            ->sortBy(['lga', 'name'])
            ->values();

        return inertia('Admin/WardTimeOverrides', compact('wards'));
    }

    public function store(Request $request, Ward $ward)
    {
        $validated = $request->validate([
            'checkin_start'  => 'required|date_format:H:i',
            'checkin_end'    => 'required|date_format:H:i|after:checkin_start',
            'checkout_start' => 'required|date_format:H:i|after_or_equal:checkin_end',
            'checkout_end'   => 'required|date_format:H:i|after:checkout_start',
        ]);

        WardTimeOverride::updateOrCreate(
            ['ward_id' => $ward->id, 'override_date' => now()->toDateString()],
            $validated
        );

        return back()->with('success', "Time override set for {$ward->name} — applies today only.");
    }

    public function destroy(Ward $ward)
    {
        WardTimeOverride::where('ward_id', $ward->id)
            ->whereDate('override_date', now()->toDateString())
            ->delete();

        return back()->with('success', "Time override cleared for {$ward->name}.");
    }
}
