<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Databoy;
use App\Models\DataboyApplication;
use App\Models\PollingUnit;
use Illuminate\Support\Facades\DB;

class DataboyAnalyticsController extends Controller
{
    public function index()
    {
        // Total PU count per ward — single query
        $wardPuCounts = PollingUnit::select('ward_id', DB::raw('count(*) as total'))
            ->groupBy('ward_id')
            ->pluck('total', 'ward_id');

        // All application counts grouped by (registered_by, polling_unit_id) — single query
        $appGroups = DataboyApplication::select(
                'registered_by',
                'polling_unit_id',
                DB::raw('count(*) as cnt')
            )
            ->groupBy('registered_by', 'polling_unit_id')
            ->get()
            ->groupBy('registered_by');

        $databoys = Databoy::with(['lga:id,name', 'ward:id,name'])
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'lga_id', 'ward_id', 'is_active'])
            ->map(function ($db) use ($wardPuCounts, $appGroups) {
                $wardId   = $db->ward_id;
                $totalPUs = $wardId ? ($wardPuCounts[$wardId] ?? 0) : 0;

                $myApps = $appGroups->get($db->id, collect());

                $completedPUs  = $myApps->filter(fn ($r) => $r->cnt >= 2)->count();
                $inProgressPUs = $myApps->filter(fn ($r) => $r->cnt == 1)->count();
                $notStartedPUs = max(0, $totalPUs - $completedPUs - $inProgressPUs);
                $totalApps     = $myApps->sum('cnt');
                $pct           = $totalPUs > 0 ? round(($completedPUs / $totalPUs) * 100) : 0;

                return [
                    'id'            => $db->id,
                    'full_name'     => $db->full_name,
                    'is_active'     => $db->is_active,
                    'lga'           => $db->lga?->name,
                    'ward'          => $db->ward?->name,
                    'ward_id'       => $wardId,
                    'total_pus'     => $totalPUs,
                    'completed_pus' => $completedPUs,
                    'in_progress'   => $inProgressPUs,
                    'not_started'   => $notStartedPUs,
                    'total_apps'    => $totalApps,
                    'pct'           => $pct,
                ];
            });

        $assigned = $databoys->filter(fn ($d) => $d['ward_id']);

        $summary = [
            'total'          => $databoys->count(),
            'fully_complete' => $databoys->where('pct', 100)->count(),
            'avg_pct'        => $assigned->count() > 0 ? round($assigned->avg('pct')) : 0,
            'total_apps'     => $databoys->sum('total_apps'),
        ];

        return inertia('Admin/DataboyAnalytics', compact('databoys', 'summary'));
    }

    public function detail(Databoy $databoy)
    {
        $wardId = $databoy->ward_id;

        if (!$wardId) {
            return response()->json(['polling_units' => []]);
        }

        $pollingUnits = PollingUnit::where('ward_id', $wardId)
            ->orderBy('name')
            ->get(['id', 'name']);

        $appCounts = DataboyApplication::where('registered_by', $databoy->id)
            ->select('polling_unit_id', DB::raw('count(*) as cnt'))
            ->groupBy('polling_unit_id')
            ->pluck('cnt', 'polling_unit_id');

        $result = $pollingUnits->map(fn ($pu) => [
            'id'    => $pu->id,
            'name'  => $pu->name,
            'count' => (int) ($appCounts[$pu->id] ?? 0),
            'done'  => ($appCounts[$pu->id] ?? 0) >= 2,
        ]);

        return response()->json([
            'databoy'       => $databoy->full_name,
            'ward'          => $databoy->ward?->name ?? '—',
            'polling_units' => $result,
        ]);
    }
}
