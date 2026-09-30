<?php

namespace App\Http\Controllers\TransportAdmin;

use App\Http\Controllers\Controller;
use App\Models\Lga;
use App\Models\RegisteredVehicle;
use App\Models\TransportAgent;
use Illuminate\Http\Request;

/**
 * The agents, and what each has captured.
 *
 * Paginated and filtered in the database from the start — the register is meant
 * to grow, so no screen here loads the whole list.
 */
class AgentController extends Controller
{
    private const PER_PAGE = 40;

    public function index(Request $request)
    {
        $search   = trim((string) $request->get('q', ''));
        $lga      = $request->get('lga', 'all');
        $category = $request->get('category', 'all');
        $status   = $request->get('status', 'all');

        $agents = TransportAgent::query()
            ->select([
                'id', 'full_name', 'phone_number', 'whatsapp_number', 'browsing_number',
                'email', 'gender', 'category', 'zone', 'branch_name',
                'lga_id', 'lga_name', 'bank_name', 'account_number', 'bank_account_name',
                'passport_photograph_path', 'is_active', 'last_login_at', 'created_at',
            ])
            // One grouped subquery for the counts, rather than a query per row.
            ->withCount([
                'vehicles',
                'vehicles as bus_count'   => fn ($q) => $q->where('category', 'bus'),
                'vehicles as bike_count'  => fn ($q) => $q->where('category', 'motorcycle_tricycle'),
            ])
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('full_name', 'like', "%{$search}%")
                ->orWhere('phone_number', 'like', "%{$search}%")
                ->orWhere('account_number', 'like', "%{$search}%")
                ->orWhere('branch_name', 'like', "%{$search}%")
                ->orWhere('zone', 'like', "%{$search}%")))
            ->when($lga !== 'all', fn ($q) => $q->where('lga_id', $lga))
            ->when($category !== 'all', fn ($q) => $q->where('category', $category))
            ->when($status === 'active', fn ($q) => $q->where('is_active', true))
            ->when($status === 'suspended', fn ($q) => $q->where('is_active', false))
            ->when($status === 'no_passport', fn ($q) => $q->whereNull('passport_photograph_path'))
            // A unique column, so paging cannot repeat or skip a row.
            ->orderByDesc('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn ($agent) => [
                'id'             => $agent->id,
                'full_name'      => $agent->full_name,
                'phone_number'   => $agent->phone_number,
                'whatsapp'       => $agent->whatsapp_number,
                'browsing'       => $agent->browsing_number,
                'email'          => $agent->email,
                'stream'         => $agent->category_label,
                'zone'           => $agent->zone,
                'branch_name'    => $agent->branch_name,
                'lga_name'       => $agent->lga_name,
                'bank_name'      => $agent->bank_name,
                'account_number' => $agent->account_number,
                'account_name'   => $agent->bank_account_name,
                'passport_url'   => $agent->passport_photograph_url,
                'is_active'      => $agent->is_active,
                'last_login_at'  => $agent->last_login_at,
                'created_at'     => $agent->created_at,
                'vehicles'       => $agent->vehicles_count,
                'korope'         => $agent->bus_count,
                'bike'           => $agent->bike_count,
            ]);

        return inertia('TransportAdmin/Agents', [
            'agents'     => $agents,
            'filters'    => compact('search', 'lga', 'category', 'status'),
            'lgas'       => Lga::orderBy('name')->get(['id', 'name']),
            'categories' => collect(TransportAgent::CATEGORIES)->map(fn ($c) => $c['label']),
        ]);
    }

    public function show(TransportAgent $agent)
    {
        return inertia('TransportAdmin/AgentDetail', [
            'agent' => [
                'id'             => $agent->id,
                'full_name'      => $agent->full_name,
                'phone_number'   => $agent->phone_number,
                'whatsapp'       => $agent->whatsapp_number,
                'browsing'       => $agent->browsing_number,
                'email'          => $agent->email,
                'gender'         => $agent->gender,
                'address'        => $agent->address,
                'stream'         => $agent->category_label,
                'zone'           => $agent->zone,
                'branch_name'    => $agent->branch_name,
                'lga_name'       => $agent->lga_name,
                'bank_name'      => $agent->bank_name,
                'account_number' => $agent->account_number,
                'account_name'   => $agent->bank_account_name,
                'passport_url'   => $agent->passport_photograph_url,
                'is_active'      => $agent->is_active,
                'last_login_at'  => $agent->last_login_at,
                'created_at'     => $agent->created_at,
                // Issued once at registration and never shown again, so an
                // agent locked out of the field has nowhere else to get it.
                'login_password' => $agent->getRawOriginal('login_password_plain'),
            ],
            'counts' => [
                'total'  => RegisteredVehicle::where('transport_agent_id', $agent->id)->count(),
                'korope' => RegisteredVehicle::where('transport_agent_id', $agent->id)->bus()->count(),
                'bike'   => RegisteredVehicle::where('transport_agent_id', $agent->id)->twoWheeler()->count(),
            ],
            'recent' => RegisteredVehicle::where('transport_agent_id', $agent->id)
                ->orderByDesc('id')
                ->limit(10)
                ->get(['id', 'plate_number', 'vehicle_type', 'category', 'owner_name', 'owner_phone', 'created_at']),
        ]);
    }

    /** Suspend or restore. The middleware drops a suspended agent's session. */
    public function toggle(TransportAgent $agent)
    {
        $agent->update(['is_active' => !$agent->is_active]);

        return back()->with(
            'success',
            $agent->is_active
                ? "{$agent->full_name} can sign in again."
                : "{$agent->full_name} has been suspended and signed out."
        );
    }
}
