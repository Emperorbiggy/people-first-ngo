<?php

namespace App\Http\Controllers\TransportAdmin;

use App\Http\Controllers\Controller;
use App\Models\RegisteredVehicle;
use App\Models\TransportAgent;
use Illuminate\Support\Facades\DB;

/**
 * The whole operation at a glance: how many agents, how much they have
 * captured, and where.
 *
 * Every figure here is a database aggregate. Nothing loads a list of rows to
 * count it in PHP, so the page costs the same whether the register holds a
 * hundred vehicles or a hundred thousand.
 */
class DashboardController extends Controller
{
    public function index()
    {
        return inertia('TransportAdmin/Dashboard', [
            'stats'      => $this->stats(),
            'byLga'      => $this->byLga(),
            'topAgents'  => $this->topAgents(),
            'daily'      => $this->lastSevenDays(),
            'categories' => RegisteredVehicle::CATEGORIES,
        ]);
    }

    private function stats(): array
    {
        $agents = TransportAgent::selectRaw("
            count(*) as total,
            sum(case when is_active = 1 then 1 else 0 end) as active,
            sum(case when category = 'bike_maruwa' then 1 else 0 end) as bike_maruwa,
            sum(case when category = 'korobe_bus' then 1 else 0 end) as korobe_bus,
            sum(case when passport_photograph_path is null then 1 else 0 end) as missing_passport
        ")->first();

        $vehicles = RegisteredVehicle::selectRaw("
            count(*) as total,
            sum(case when category = 'bus' then 1 else 0 end) as bus,
            sum(case when category = 'motorcycle_tricycle' then 1 else 0 end) as motorcycle_tricycle,
            count(distinct owner_phone) as owners
        ")->first();

        return [
            'agents'           => (int) $agents->total,
            'agents_active'    => (int) $agents->active,
            'agents_bike'      => (int) $agents->bike_maruwa,
            'agents_korope'    => (int) $agents->korobe_bus,
            'missing_passport' => (int) $agents->missing_passport,
            'vehicles'         => (int) $vehicles->total,
            'vehicles_korope'  => (int) $vehicles->bus,
            'vehicles_bike'    => (int) $vehicles->motorcycle_tricycle,
            'owners'           => (int) $vehicles->owners,
            'today'            => RegisteredVehicle::whereDate('created_at', today())->count(),
            'this_week'        => RegisteredVehicle::where('created_at', '>=', now()->startOfWeek())->count(),
        ];
    }

    /** Vehicles and agents per local government, busiest first. */
    private function byLga()
    {
        return RegisteredVehicle::selectRaw('
                lga_name,
                count(*) as vehicles,
                count(distinct transport_agent_id) as agents
            ')
            ->whereNotNull('lga_name')
            ->groupBy('lga_name')
            ->orderByDesc('vehicles')
            ->limit(20)
            ->get();
    }

    /** The ten agents with the most captures — a grouped count, not a scan. */
    private function topAgents()
    {
        return RegisteredVehicle::selectRaw('transport_agent_id, count(*) as vehicles')
            ->groupBy('transport_agent_id')
            ->orderByDesc('vehicles')
            ->limit(10)
            ->with('agent:id,full_name,lga_name,category')
            ->get()
            ->map(fn ($row) => [
                'id'       => $row->transport_agent_id,
                'name'     => $row->agent->full_name ?? '—',
                'lga'      => $row->agent->lga_name ?? '—',
                'stream'   => $row->agent->category_label ?? '—',
                'vehicles' => (int) $row->vehicles,
            ]);
    }

    /**
     * Captures per day for the last week, zero-filled — without the fill a
     * quiet day vanishes and the trend reads as though it never happened.
     */
    private function lastSevenDays(): array
    {
        $counts = RegisteredVehicle::where('created_at', '>=', today()->subDays(6))
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
