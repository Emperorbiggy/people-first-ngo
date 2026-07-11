<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Models\DataboyApplication;
use App\Models\Lga;
use App\Models\PollingUnit;
use App\Models\Setting;
use App\Models\State;
use App\Models\Ward;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ApplicationController extends Controller
{
    public function index()
    {
        $databoy      = Auth::guard('databoy')->user();
        $applications = DataboyApplication::where('registered_by', $databoy->id)
            ->with(['lga:id,name', 'ward:id,name', 'pollingUnit:id,name'])
            ->latest()
            ->get();

        $pollingUnits = $databoy->ward_id
            ? PollingUnit::where('ward_id', $databoy->ward_id)->orderBy('name')->get(['id', 'name'])
            : collect();

        return inertia('Databoy/Applications/Index', [
            'applications' => $applications,
            'pollingUnits' => $pollingUnits,
        ]);
    }

    public function create()
    {
        $accessEnabled = Setting::get('databoy_access_enabled', '1') === '1';
        $states = State::orderBy('name')->get(['id', 'name']);
        return inertia('Databoy/Applications/Create', [
            'states'        => $states,
            'accessEnabled' => $accessEnabled,
        ]);
    }

    public function getLgas(State $state)
    {
        return response()->json(
            Lga::where('state_id', $state->id)->orderBy('name')->get(['id', 'name'])
        );
    }

    public function getWards(Lga $lga)
    {
        return response()->json(
            Ward::where('lga_id', $lga->id)->orderBy('name')->get(['id', 'name'])
        );
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

        if (Setting::get('databoy_access_enabled', '1') !== '1') {
            return back()->withErrors(['account' => 'Application access is currently disabled by admin.']);
        }

        $validated = $request->validate([
            'full_name'                         => 'required|string|max:255',
            'gender'                            => 'required|in:Male,Female',
            'age'                               => 'required|integer|min:18|max:60',
            'email_address'                     => 'required|email|max:255',
            'calling_phone_number'              => 'required|string|max:20',
            'whatsapp_number'                   => 'required|string|max:20',
            'state_of_residence'                => 'required|string|max:255',
            'lga_id'                            => 'required|exists:lgas,id',
            'ward_id'                           => 'required|exists:wards,id',
            'polling_unit_id'                   => 'nullable|exists:polling_units,id',
            'house_address'                     => 'required|string',
            'browsing_network'                  => 'required|string|max:50',
            'browsing_number'                   => 'required|string|max:20',
            'bank_name'                         => 'required|string|max:255',
            'bank_code'                         => 'nullable|string|max:10',
            'account_number'                    => 'required|string|max:20',
            'bank_account_name'                 => 'required|string|max:255',
            'employment_status'                 => 'required|string|max:100',
            'availability'                      => 'nullable|string|max:100',
            'current_occupation'                => 'nullable|string|max:255',
            'work_grade_level'                  => 'nullable|string|max:50',
            'has_voter_card'                    => 'boolean',
            'passport_photograph'               => 'required|extensions:jpg,jpeg,png|max:2048',
            'valid_id_card'                     => 'required|extensions:jpg,jpeg,png|max:5120',
            'highest_qualification_certificate' => 'required|extensions:pdf,jpg,jpeg,png|max:5120',
        ]);

        $passportPath    = $this->storeFile($request->file('passport_photograph'), $validated['full_name'], 'passport');
        $idCardPath      = $this->storeFile($request->file('valid_id_card'), $validated['full_name'], 'id_card');
        $certificatePath = $this->storeFile($request->file('highest_qualification_certificate'), $validated['full_name'], 'certificate');

        DataboyApplication::create([
            'registered_by'                            => $databoy->id,
            'full_name'                                => $validated['full_name'],
            'gender'                                   => $validated['gender'],
            'age'                                      => $validated['age'],
            'email_address'                            => $validated['email_address'],
            'calling_phone_number'                     => $validated['calling_phone_number'],
            'whatsapp_number'                          => $validated['whatsapp_number'],
            'state_of_residence'                       => $validated['state_of_residence'],
            'lga_id'                                   => $validated['lga_id'],
            'ward_id'                                  => $validated['ward_id'],
            'polling_unit_id'                          => $validated['polling_unit_id'] ?? null,
            'house_address'                            => $validated['house_address'],
            'browsing_network'                         => $validated['browsing_network'],
            'browsing_number'                          => $validated['browsing_number'],
            'bank_name'                                => $validated['bank_name'],
            'bank_code'                                => $validated['bank_code'] ?? null,
            'account_number'                           => $validated['account_number'],
            'bank_account_name'                        => $validated['bank_account_name'],
            'employment_status'                        => $validated['employment_status'],
            'availability'                             => $validated['availability'] ?? null,
            'current_occupation'                       => $validated['current_occupation'] ?? null,
            'work_grade_level'                         => $validated['work_grade_level'] ?? null,
            'has_voter_card'                           => $request->boolean('has_voter_card'),
            'passport_photograph_path'                 => $passportPath,
            'valid_id_card_path'                       => $idCardPath,
            'highest_qualification_certificate_path'   => $certificatePath,
        ]);

        return redirect()->route('databoy.applications.index')
            ->with('success', 'Application submitted successfully.');
    }

    public function updatePollingUnit(Request $request, DataboyApplication $databoyApplication)
    {
        $databoy = Auth::guard('databoy')->user();

        abort_if($databoyApplication->registered_by !== $databoy->id, 403);

        $validated = $request->validate([
            'polling_unit_id' => 'required|exists:polling_units,id',
        ]);

        $pollingUnit = PollingUnit::find($validated['polling_unit_id']);

        if (!$pollingUnit || $pollingUnit->ward_id !== $databoy->ward_id) {
            return back()->withErrors(['polling_unit_id' => 'That polling unit is not in your assigned ward.']);
        }

        $databoyApplication->update(['polling_unit_id' => $validated['polling_unit_id']]);

        return back()->with('success', "Polling unit updated for {$databoyApplication->full_name}.");
    }

    private function storeFile($file, string $name, string $type): string
    {
        $cleanName = strtolower(preg_replace('/\s+/', ' ', trim($name)));
        $rand      = rand(1000, 9999);
        $filename  = "{$cleanName} {$rand} {$type}." . $file->getClientOriginalExtension();
        return $file->storeAs('databoy-applications', $filename, 'public');
    }
}
