<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Databoy;
use App\Models\Lga;
use App\Models\PoOfficer;
use App\Models\State;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Logins for APO/PO check-in officers. Each one is tied to a single LGA and
 * sees only that LGA's roster; checking someone in is what pays them.
 */
class PoCheckInOfficerController extends Controller
{
    public function index()
    {
        $officers = Databoy::where('role', 'po_checkin_officer')
            ->with('lga:id,name')
            ->latest()
            ->get(['id', 'full_name', 'login_email', 'login_password_plain', 'calling_phone_number', 'is_active', 'lga_id', 'created_at'])
            ->map(function ($officer) {
                $lgaName = $officer->lga->name ?? null;

                return [
                    'id'                   => $officer->id,
                    'full_name'            => $officer->full_name,
                    'login_email'          => $officer->login_email,
                    'login_password_plain' => $officer->getRawOriginal('login_password_plain'),
                    'calling_phone_number' => $officer->calling_phone_number,
                    'is_active'            => $officer->is_active,
                    'lga'                  => $lgaName,
                    'all_lgas'             => $officer->lga_id === null,
                    // How many roster rows they will actually see — a zero here
                    // for an LGA-scoped login usually means the LGA name in the
                    // sheet doesn't match. A statewide login sees everyone.
                    'roster_count'         => $lgaName
                        ? PoOfficer::forLga($lgaName)->count()
                        : PoOfficer::count(),
                    'checked_in_count'     => $lgaName
                        ? PoOfficer::forLga($lgaName)->checkedIn()->count()
                        : PoOfficer::checkedIn()->count(),
                    'created_at'           => $officer->created_at,
                ];
            });

        return inertia('Admin/PoCheckInOfficers', [
            'officers' => $officers,
            'lgas'     => $this->osunLgas(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name'            => 'required|string|max:255',
            'calling_phone_number' => 'nullable|string|max:20',
            'login_email'          => ['required', 'email', 'max:255', Rule::unique('databoys', 'login_email')],
            'password'             => 'required|string|min:6|max:255',
            // Blank means every LGA — one statewide login instead of a seat
            // per LGA.
            'lga_id'               => ['nullable', Rule::exists('lgas', 'id')],
        ]);

        Databoy::create([
            'full_name'            => $validated['full_name'],
            'calling_phone_number' => $validated['calling_phone_number'] ?? null,
            'login_email'          => $validated['login_email'],
            // Kept in the clear alongside the hash, the same way other databoy
            // logins are, so the credentials can be read back out.
            'login_password_plain' => $validated['password'],
            'password'             => Hash::make($validated['password']),
            'role'                 => 'po_checkin_officer',
            'lga_id'               => $validated['lga_id'] ?? null,
            'is_active'            => true,
        ]);

        $where = isset($validated['lga_id'])
            ? Lga::find($validated['lga_id'])->name
            : 'every LGA';

        return back()->with('success', "{$validated['full_name']} can now check in APO/PO officers in {$where}.");
    }

    public function toggle(Databoy $databoy)
    {
        abort_unless($databoy->isPoCheckInOfficer(), 404);

        $databoy->update(['is_active' => !$databoy->is_active]);

        return back()->with('success', $databoy->is_active
            ? "{$databoy->full_name} can sign in again."
            : "{$databoy->full_name} has been suspended.");
    }

    public function destroy(Databoy $databoy)
    {
        abort_unless($databoy->isPoCheckInOfficer(), 404);

        $name = $databoy->full_name;
        $databoy->delete();

        return back()->with('success', "{$name} has been removed.");
    }

    private function osunLgas()
    {
        $stateId = State::where('name', 'like', '%Osun%')->value('id');

        return Lga::where('state_id', $stateId)->orderBy('name')->get(['id', 'name']);
    }
}
