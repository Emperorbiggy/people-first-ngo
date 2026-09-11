<?php

namespace App\Http\Controllers\TransportAgent;

use App\Http\Controllers\Controller;
use App\Models\RegisteredVehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Vehicle capture, from the agent's own portal.
 *
 * An agent may correct what they captured but never delete it — a mistyped
 * plate should be fixable without a record being able to disappear.
 */
class VehicleController extends Controller
{
    public function index(Request $request)
    {
        $agent = $this->agent();

        $search   = trim((string) $request->query('q', ''));
        $category = $request->query('category', 'all');

        $vehicles = RegisteredVehicle::where('transport_agent_id', $agent->id)
            ->when(in_array($category, ['bus', 'motorcycle_tricycle'], true), fn ($q) => $q->where('category', $category))
            ->when($search !== '', function ($q) use ($search) {
                // Every word must appear somewhere, so "abc toyota" finds a
                // Toyota with plate ABC-… regardless of word order.
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
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return inertia('TransportAgent/Vehicles', [
            'vehicles'   => $vehicles,
            'filters'    => ['q' => $search, 'category' => $category],
            'categories' => RegisteredVehicle::CATEGORIES,
            'types'      => RegisteredVehicle::TYPES,
            'counts'     => [
                'all'                 => RegisteredVehicle::where('transport_agent_id', $agent->id)->count(),
                'bus'                 => RegisteredVehicle::where('transport_agent_id', $agent->id)->bus()->count(),
                'motorcycle_tricycle' => RegisteredVehicle::where('transport_agent_id', $agent->id)->twoWheeler()->count(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $agent     = $this->agent();
        $validated = $this->validated($request);

        $validated['plate_number'] = $this->normalisePlate($validated['plate_number']);

        // Across every agent, not just this one — the same vehicle must not be
        // captured twice and counted twice.
        if ($taken = RegisteredVehicle::where('plate_number', $validated['plate_number'])->first()) {
            return back()->withInput()->withErrors([
                'plate_number' => $taken->transport_agent_id === $agent->id
                    ? 'You have already registered this vehicle.'
                    : 'This vehicle has already been registered by another agent.',
            ]);
        }

        RegisteredVehicle::create($validated + [
            'transport_agent_id' => $agent->id,
            'lga_id'             => $agent->lga_id,
            'lga_name'           => $agent->lga_name,
            'vehicle_photo_path' => $this->storePhoto($request, 'vehicle_photo', $validated['plate_number'], 'vehicle'),
            'owner_photo_path'   => $this->storePhoto($request, 'owner_photo', $validated['plate_number'], 'owner'),
        ]);

        return back()->with('success', "{$validated['plate_number']} registered.");
    }

    public function update(Request $request, RegisteredVehicle $vehicle)
    {
        $agent = $this->agent();

        // Their own only — an agent must not be able to edit another's work by
        // guessing an id.
        abort_unless($vehicle->transport_agent_id === $agent->id, 403);

        $validated = $this->validated($request);
        $validated['plate_number'] = $this->normalisePlate($validated['plate_number']);

        $taken = RegisteredVehicle::where('plate_number', $validated['plate_number'])
            ->where('id', '!=', $vehicle->id)
            ->exists();

        if ($taken) {
            return back()->withInput()->withErrors([
                'plate_number' => 'Another registration already uses this plate number.',
            ]);
        }

        // A photo is only replaced when a new one is sent; editing a typo must
        // not wipe the evidence already captured.
        $vehicle->update($validated + array_filter([
            'vehicle_photo_path' => $this->storePhoto($request, 'vehicle_photo', $validated['plate_number'], 'vehicle'),
            'owner_photo_path'   => $this->storePhoto($request, 'owner_photo', $validated['plate_number'], 'owner'),
        ]));

        return back()->with('success', "{$vehicle->plate_number} updated.");
    }

    private function validated(Request $request): array
    {
        $category = $request->input('category');
        $types    = RegisteredVehicle::TYPES[$category] ?? [];

        return $request->validate([
            'category'      => ['required', Rule::in(array_keys(RegisteredVehicle::CATEGORIES))],
            // The type has to belong to the chosen category, or a tricycle
            // could be filed as a bus and counted in the wrong stream.
            'vehicle_type'  => ['required', Rule::in($types)],
            'plate_number'  => 'required|string|max:20',
            'make_model'    => 'nullable|string|max:120',
            'colour'        => 'nullable|string|max:60',
            'capacity'      => 'nullable|integer|min:1|max:200',
            'owner_name'    => 'required|string|max:255',
            'owner_phone'   => ['required', 'string', 'regex:/^\d{11}$/'],
            'owner_address' => 'nullable|string|max:255',
            'vehicle_photo' => 'nullable|image|max:5120',
            'owner_photo'   => 'nullable|image|max:5120',
        ], [
            'vehicle_type.in'   => 'Choose a vehicle type that belongs to the selected category.',
            'owner_phone.regex' => "The owner's phone number must be exactly 11 digits.",
        ]);
    }

    /** Uppercased and stripped of spacing/dashes, so ABC 123 XY == abc-123-xy. */
    private function normalisePlate(string $plate): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $plate));
    }

    private function storePhoto(Request $request, string $field, string $plate, string $kind): ?string
    {
        if (!$request->hasFile($field)) {
            return null;
        }

        return $request->file($field)->storeAs(
            'vehicle-registrations',
            $plate . '-' . $kind . '-' . Str::random(6) . '.jpg',
            'public'
        );
    }

    private function agent()
    {
        return Auth::guard('transport_agent')->user();
    }
}
