<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Models\ApoOfficer;
use App\Models\DataboyApplication;
use App\Models\DataboyApplicantRecipient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ApoOfficerController extends Controller
{
    public function index()
    {
        $databoy = Auth::guard('databoy')->user();

        $applications = DataboyApplication::where('registered_by', $databoy->id)
            ->with(['lga:id,name', 'ward:id,name', 'apoOfficer'])
            ->latest()
            ->get();

        return inertia('Databoy/ApoOfficers/Index', compact('applications'));
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

        $validated = $request->validate([
            'full_name'            => 'required|string|max:255',
            'bank_name'            => 'required|string|max:255',
            'bank_code'            => 'nullable|string|max:10',
            'account_number'       => 'required|string|max:20',
            'bank_account_name'    => 'required|string|max:255',
            'passport_photograph'  => 'nullable|extensions:jpg,jpeg,png|max:2048',
        ]);

        $accountChanged = $validated['account_number'] !== $databoyApplication->account_number
            || ($validated['bank_code'] ?? null) !== $databoyApplication->bank_code;

        $data = [
            'full_name'         => $validated['full_name'],
            'bank_name'         => $validated['bank_name'],
            'bank_code'         => $validated['bank_code'] ?? null,
            'account_number'    => $validated['account_number'],
            'bank_account_name' => $validated['bank_account_name'],
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

        return back()->with('success', "{$databoyApplication->full_name}'s details have been replaced.");
    }
}
