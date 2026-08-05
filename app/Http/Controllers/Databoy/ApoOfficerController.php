<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Models\ApoOfficer;
use App\Models\DataboyApplication;
use App\Models\DataboyApplicantRecipient;
use App\Models\PollingUnit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ApoOfficerController extends Controller
{
    public function index()
    {
        $databoy = Auth::guard('databoy')->user();

        $applications = DataboyApplication::where('registered_by', $databoy->id)
            ->with(['lga:id,name', 'ward:id,name', 'pollingUnit:id,name', 'apoOfficer'])
            ->latest()
            ->get();

        $pollingUnits = $databoy->ward_id
            ? PollingUnit::where('ward_id', $databoy->ward_id)->orderBy('name')->get(['id', 'name'])
            : collect();

        return inertia('Databoy/ApoOfficers/Index', compact('applications', 'pollingUnits'));
    }

    public function qualify(DataboyApplication $databoyApplication)
    {
        $databoy = Auth::guard('databoy')->user();
        abort_if($databoyApplication->registered_by !== $databoy->id, 403);

        if (ApoOfficer::where('databoy_application_id', $databoyApplication->id)->exists()) {
            return back()->with('error', "{$databoyApplication->full_name} is already qualified as an APO officer.");
        }

        ApoOfficer::create([
            'databoy_application_id' => $databoyApplication->id,
            'qualified_by'           => $databoy->id,
        ]);

        return back()->with('success', "{$databoyApplication->full_name} has been qualified as an APO officer.");
    }

    public function replace(Request $request, DataboyApplication $databoyApplication)
    {
        $databoy = Auth::guard('databoy')->user();
        abort_if($databoyApplication->registered_by !== $databoy->id, 403);

        if (!$databoyApplication->apoOfficer) {
            return back()->with('error', 'Only qualified APO officers can be replaced.');
        }

        $oldName = $databoyApplication->full_name;

        $validated = $request->validate([
            'full_name'            => 'required|string|max:255',
            'gender'               => 'required|in:Male,Female',
            'age'                  => 'required|integer|min:18|max:60',
            'email_address'        => 'required|email|max:255',
            'calling_phone_number' => 'required|string|max:20',
            'whatsapp_number'      => 'required|string|max:20',
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
            'passport_photograph'  => 'nullable|extensions:jpg,jpeg,png|max:2048',
        ]);

        if ($validated['polling_unit_id'] ?? null) {
            $pollingUnit = PollingUnit::find($validated['polling_unit_id']);
            if (!$pollingUnit || $pollingUnit->ward_id !== $databoyApplication->ward_id) {
                return back()->withErrors(['polling_unit_id' => 'That polling unit is not in this registration\'s ward.']);
            }
        }

        $accountChanged = $validated['account_number'] !== $databoyApplication->account_number
            || ($validated['bank_code'] ?? null) !== $databoyApplication->bank_code;

        $data = [
            'full_name'             => $validated['full_name'],
            'gender'                => $validated['gender'],
            'age'                   => $validated['age'],
            'email_address'         => $validated['email_address'],
            'calling_phone_number'  => $validated['calling_phone_number'],
            'whatsapp_number'       => $validated['whatsapp_number'],
            'polling_unit_id'       => $validated['polling_unit_id'] ?? null,
            'house_address'         => $validated['house_address'],
            'browsing_network'      => $validated['browsing_network'],
            'browsing_number'       => $validated['browsing_number'],
            'bank_name'             => $validated['bank_name'],
            'bank_code'             => $validated['bank_code'] ?? null,
            'account_number'        => $validated['account_number'],
            'bank_account_name'     => $validated['bank_account_name'],
            'employment_status'     => $validated['employment_status'],
            'availability'          => $validated['availability'] ?? null,
            'current_occupation'    => $validated['current_occupation'] ?? null,
            'work_grade_level'      => $validated['work_grade_level'] ?? null,
            'has_voter_card'        => $request->boolean('has_voter_card'),
        ];

        $oldPassportPath = $databoyApplication->passport_photograph_path;

        if ($request->hasFile('passport_photograph')) {
            $cleanName = strtolower(preg_replace('/\s+/', ' ', trim($validated['full_name'])));
            $rand      = rand(1000, 9999);
            $filename  = "{$cleanName} {$rand} passport." . $request->file('passport_photograph')->getClientOriginalExtension();
            $data['passport_photograph_path'] = $request->file('passport_photograph')->storeAs('databoy-applications', $filename, 'public');
        }

        $databoyApplication->update($data);

        if (isset($data['passport_photograph_path']) && $oldPassportPath && Storage::disk('public')->exists($oldPassportPath)) {
            Storage::disk('public')->delete($oldPassportPath);
        }

        // The account number/bank changed — any existing Paystack transfer
        // recipient was created for the OLD account and would silently keep
        // paying it. Drop it so the next payment attempt creates a fresh
        // recipient for the new account details.
        if ($accountChanged) {
            DataboyApplicantRecipient::where('databoy_application_id', $databoyApplication->id)->delete();
        }

        // Only overwrite previous_full_name when the name actually changed —
        // otherwise a name-unchanged replace (e.g. only bank details fixed)
        // would wipe out the real previous name from an earlier replace.
        $apoOfficer = $databoyApplication->apoOfficer;
        $apoOfficer->update([
            'previous_full_name' => $validated['full_name'] !== $oldName ? $oldName : $apoOfficer->previous_full_name,
            'replaced_at'        => now(),
        ]);

        return back()->with('success', "{$databoyApplication->full_name}'s details have been replaced.");
    }
}
