<?php

namespace App\Http\Controllers\TransportAdmin;

use App\Http\Controllers\Controller;
use App\Models\Lga;
use App\Models\RegisteredVehicle;
use App\Models\TransportAgent;
use Illuminate\Http\Request;

/**
 * The vehicle register: everything the agents have captured, with both photos.
 *
 * Read-only. An agent's capture is final here — correcting a record is the
 * agent's own job in their portal, which keeps one version of the truth.
 */
class VehicleController extends Controller
{
    private const PER_PAGE = 40;

    public function index(Request $request)
    {
        $filters = $this->filters($request);

        $vehicles = $this->query($filters)
            ->with('agent:id,full_name,phone_number,category')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn ($v) => [
                'id'            => $v->id,
                'plate_number'  => $v->plate_number,
                'category'      => $v->category,
                'category_label' => $v->category_label,
                'vehicle_type'  => $v->vehicle_type,
                'make_model'    => $v->make_model,
                'colour'        => $v->colour,
                'capacity'      => $v->capacity,
                'owner_name'    => $v->owner_name,
                'owner_phone'   => $v->owner_phone,
                'owner_address' => $v->owner_address,
                'lga_name'      => $v->lga_name,
                'vehicle_photo_url' => $v->vehicle_photo_url,
                'owner_photo_url'   => $v->owner_photo_url,
                'agent'         => $v->agent?->full_name ?? '—',
                'agent_id'      => $v->transport_agent_id,
                'created_at'    => $v->created_at,
            ]);

        // Tab counts from one grouped query. Every other filter applies, but not
        // the category itself — a tab has to show its own total even while a
        // different tab is the one selected.
        $counts = $this->query(array_merge($filters, ['category' => 'all']))
            ->reorder()
            ->selectRaw('category, count(*) as total')
            ->groupBy('category')
            ->pluck('total', 'category');

        return inertia('TransportAdmin/Vehicles', [
            'vehicles'   => $vehicles,
            'filters'    => $filters,
            'categories' => RegisteredVehicle::CATEGORIES,
            'lgas'       => Lga::orderBy('name')->get(['id', 'name']),
            'agents'     => TransportAgent::orderBy('full_name')->get(['id', 'full_name']),
            'counts'     => [
                'all'                 => (int) $counts->sum(),
                'bus'                 => (int) ($counts['bus'] ?? 0),
                'motorcycle_tricycle' => (int) ($counts['motorcycle_tricycle'] ?? 0),
            ],
        ]);
    }

    /**
     * @return array<string, string>
     */
    private function filters(Request $request): array
    {
        return [
            'search'   => trim((string) $request->get('q', '')),
            'category' => $request->get('category', 'all'),
            'lga'      => $request->get('lga', 'all'),
            'agent'    => $request->get('agent', 'all'),
            'from'     => $request->get('from', ''),
            'to'       => $request->get('to', ''),
        ];
    }

    /** The filtered register, ordered by a unique column so paging is stable. */
    private function query(array $f)
    {
        $search = $f['search'] ?? '';

        return RegisteredVehicle::query()
            ->when($search !== '', function ($q) use ($search) {
                // Every word must appear somewhere, so "abc toyota" finds a
                // Toyota on plate ABC-… whichever order they are typed.
                foreach (preg_split('/\s+/', $search) as $term) {
                    $like = '%' . $term . '%';
                    $q->where(fn ($w) => $w
                        ->where('plate_number', 'like', $like)
                        ->orWhere('owner_name', 'like', $like)
                        ->orWhere('owner_phone', 'like', $like)
                        ->orWhere('make_model', 'like', $like)
                        ->orWhere('vehicle_type', 'like', $like));
                }
            })
            ->when(($f['category'] ?? 'all') !== 'all', fn ($q) => $q->where('category', $f['category']))
            ->when(($f['lga'] ?? 'all') !== 'all', fn ($q) => $q->where('lga_id', $f['lga']))
            ->when(($f['agent'] ?? 'all') !== 'all', fn ($q) => $q->where('transport_agent_id', $f['agent']))
            ->when(!empty($f['from']), fn ($q) => $q->whereDate('created_at', '>=', $f['from']))
            ->when(!empty($f['to']), fn ($q) => $q->whereDate('created_at', '<=', $f['to']))
            ->orderByDesc('id');
    }
}
