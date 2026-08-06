<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Databoy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Accounts whose only ability is accrediting APO officers. They live in the
 * databoys table under the apo_accreditation_officer role and sign in at the
 * normal databoy login; DataboyAuth keeps them on the APO accreditation page.
 */
class AccreditationOfficerController extends Controller
{
    public function index()
    {
        $officers = Databoy::where('role', 'apo_accreditation_officer')
            ->latest()
            ->get(['id', 'full_name', 'login_email', 'login_password_plain', 'calling_phone_number', 'is_active', 'created_at'])
            ->map(fn ($officer) => [
                'id'                   => $officer->id,
                'full_name'            => $officer->full_name,
                'login_email'          => $officer->login_email,
                'login_password_plain' => $officer->getRawOriginal('login_password_plain'),
                'calling_phone_number' => $officer->calling_phone_number,
                'is_active'            => $officer->is_active,
                'created_at'           => $officer->created_at,
            ]);

        return inertia('Admin/AccreditationOfficers', ['officers' => $officers]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name'            => 'required|string|max:255',
            'calling_phone_number' => 'nullable|string|max:20',
            'login_email'          => ['required', 'email', 'max:255', Rule::unique('databoys', 'login_email')],
            'password'             => 'required|string|min:6|max:255',
        ]);

        Databoy::create([
            'full_name'            => $validated['full_name'],
            'calling_phone_number' => $validated['calling_phone_number'] ?? null,
            'login_email'          => $validated['login_email'],
            // Kept in the clear alongside the hash, the same way databoy
            // logins are, so admin can read the credentials back out.
            'login_password_plain' => $validated['password'],
            'password'             => Hash::make($validated['password']),
            'role'                 => 'apo_accreditation_officer',
            'is_active'            => true,
        ]);

        return back()->with('success', "{$validated['full_name']} can now sign in and accredit APO officers.");
    }

    public function toggle(Databoy $databoy)
    {
        abort_unless($databoy->isApoAccreditationOfficer(), 404);

        $databoy->update(['is_active' => !$databoy->is_active]);

        return back()->with('success', $databoy->is_active
            ? "{$databoy->full_name} can sign in again."
            : "{$databoy->full_name} has been suspended.");
    }

    public function destroy(Databoy $databoy)
    {
        abort_unless($databoy->isApoAccreditationOfficer(), 404);

        $name = $databoy->full_name;
        $databoy->delete();

        return back()->with('success', "{$name} has been removed.");
    }
}
