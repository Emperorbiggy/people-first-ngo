<?php

namespace App\Http\Controllers\TransportAgent;

use App\Http\Controllers\Controller;
use App\Models\RegisteredVehicle;
use Illuminate\Support\Facades\Auth;

/**
 * The transport agent's own portal: what they have captured so far, split by
 * the two streams the work is counted in.
 */
class DashboardController extends Controller
{
    public function index()
    {
        $agent = Auth::guard('transport_agent')->user();
        $mine  = RegisteredVehicle::where('transport_agent_id', $agent->id);

        return inertia('TransportAgent/Dashboard', [
            'stats' => [
                'total'               => (clone $mine)->count(),
                'bus'                 => (clone $mine)->bus()->count(),
                'motorcycle_tricycle' => (clone $mine)->twoWheeler()->count(),
                'today'               => (clone $mine)->whereDate('created_at', today())->count(),
                'this_week'           => (clone $mine)->where('created_at', '>=', now()->startOfWeek())->count(),
                // Owners reached, which is not the same as vehicles: one person
                // can own several.
                'owners'              => (clone $mine)->distinct('owner_phone')->count('owner_phone'),
            ],
            // Enough to show momentum without loading the whole list.
            // The photo path columns are included because the model appends URL
            // accessors built from them.
            'recent' => (clone $mine)->latest()->limit(5)->get([
                'id', 'plate_number', 'vehicle_type', 'category', 'owner_name', 'created_at',
                'vehicle_photo_path', 'owner_photo_path',
            ]),
            'daily' => $this->lastSevenDays($agent->id),
        ]);
    }

    /**
     * Counts for the last seven days, zero-filled.
     *
     * Without the zero-fill a quiet day vanishes from the chart and the trend
     * reads as though it never happened.
     */
    private function lastSevenDays(int $agentId): array
    {
        $counts = RegisteredVehicle::where('transport_agent_id', $agentId)
            ->where('created_at', '>=', today()->subDays(6))
            ->selectRaw('DATE(created_at) AS day, COUNT(*) AS total')
            ->groupBy('day')
            ->pluck('total', 'day');

        return collect(range(6, 0))
            ->map(function ($back) use ($counts) {
                $date = today()->subDays($back);

                return [
                    'label' => $date->format('D'),
                    'date'  => $date->toDateString(),
                    'count' => (int) ($counts[$date->toDateString()] ?? 0),
                ];
            })
            ->all();
    }
}
