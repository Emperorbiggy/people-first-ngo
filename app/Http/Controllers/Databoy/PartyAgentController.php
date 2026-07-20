<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Models\PartyAgent;
use App\Models\PollingUnit;
use App\Models\Setting;
use App\Models\Ward;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PartyAgentController extends Controller
{
    public function index()
    {
        $databoy     = Auth::guard('databoy')->user();
        $partyAgents = PartyAgent::where('registered_by', $databoy->id)
            ->with(['lga:id,name', 'ward:id,name', 'pollingUnit:id,name'])
            ->latest()
            ->get();

        return inertia('Databoy/PartyAgents/Index', [
            'partyAgents' => $partyAgents,
        ]);
    }

    public function create()
    {
        $accessEnabled = Setting::get('party_agent_registration_enabled', '1') === '1';

        return inertia('Databoy/PartyAgents/Create', [
            'accessEnabled' => $accessEnabled,
        ]);
    }

    public function getPollingUnits(Ward $ward)
    {
        return response()->json(
            PollingUnit::where('ward_id', $ward->id)->orderBy('name')->get(['id', 'name'])
        );
    }

    public function store(Request $request)
    {
        $databoy = Auth::guard('databoy')->user();

        if (Setting::get('party_agent_registration_enabled', '1') !== '1') {
            return back()->withErrors(['account' => 'Party agent registration is currently disabled by admin.']);
        }

        $validated = $request->validate([
            'full_name'             => 'required|string|max:255',
            'gender'                => 'required|in:Male,Female',
            'age'                   => 'required|integer|min:18|max:60',
            'email_address'        => 'required|email|max:255',
            'calling_phone_number' => 'required|string|max:20',
            'whatsapp_number'      => 'required|string|max:20',
            'state_of_residence'   => 'required|string|max:255',
            'lga_id'               => 'required|exists:lgas,id',
            'ward_id'              => 'required|exists:wards,id',
            'polling_unit_id'      => 'nullable|exists:polling_units,id',
            'house_address'        => 'required|string',
            'browsing_network'     => 'required|string|max:50',
            'browsing_number'      => 'required|string|max:20',
            'bank_name'            => 'required|string|max:255',
            'bank_code'            => 'nullable|string|max:10',
            'account_number'       => 'required|string|max:20',
            'bank_account_name'    => 'required|string|max:255',
            'employment_status'    => 'required|string|max:100',
            'availability'         => 'nullable|string|max:100',
            'current_occupation'   => 'nullable|string|max:255',
            'work_grade_level'     => 'nullable|string|max:50',
            'has_voter_card'       => 'boolean',
            'passport_photograph'  => 'required|extensions:jpg,jpeg,png|max:2048',
        ]);

        $passportPath = $this->storeFile($request->file('passport_photograph'), $validated['full_name'], 'passport');

        PartyAgent::create([
            'registered_by'             => $databoy->id,
            'full_name'                 => $validated['full_name'],
            'gender'                    => $validated['gender'],
            'age'                       => $validated['age'],
            'email_address'             => $validated['email_address'],
            'calling_phone_number'      => $validated['calling_phone_number'],
            'whatsapp_number'           => $validated['whatsapp_number'],
            'state_of_residence'        => $validated['state_of_residence'],
            'lga_id'                    => $validated['lga_id'],
            'ward_id'                   => $validated['ward_id'],
            'polling_unit_id'           => $validated['polling_unit_id'] ?? null,
            'house_address'             => $validated['house_address'],
            'browsing_network'          => $validated['browsing_network'],
            'browsing_number'           => $validated['browsing_number'],
            'bank_name'                 => $validated['bank_name'],
            'bank_code'                 => $validated['bank_code'] ?? null,
            'account_number'            => $validated['account_number'],
            'bank_account_name'         => $validated['bank_account_name'],
            'employment_status'         => $validated['employment_status'],
            'availability'              => $validated['availability'] ?? null,
            'current_occupation'        => $validated['current_occupation'] ?? null,
            'work_grade_level'          => $validated['work_grade_level'] ?? null,
            'has_voter_card'            => $request->boolean('has_voter_card'),
            'passport_photograph_path'  => $passportPath,
        ]);

        return redirect()->route('databoy.party-agents.index')
            ->with('success', 'Party agent registered successfully.');
    }

    private function storeFile($file, string $name, string $type): string
    {
        $cleanName = strtolower(preg_replace('/\s+/', ' ', trim($name)));
        $rand      = rand(1000, 9999);
        $filename  = "{$cleanName} {$rand} {$type}." . $file->getClientOriginalExtension();

        return $file->storeAs('party-agents', $filename, 'public');
    }
}
