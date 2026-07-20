<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\RequiresPasscode;
use App\Http\Controllers\Controller;
use App\Models\Lga;
use App\Models\LgaTransportFare;
use Illuminate\Http\Request;

class TransportFareController extends Controller
{
    use RequiresPasscode;

    public function index()
    {
        $lgas = Lga::with('state:id,name', 'transportFare')
            ->orderBy('name')
            ->get(['id', 'name', 'state_id'])
            ->map(fn ($lga) => [
                'id'     => $lga->id,
                'name'   => $lga->name,
                'state'  => $lga->state?->name,
                'amount' => $lga->transportFare?->amount ?? 0,
            ]);

        return inertia('Admin/TransportFares', compact('lgas'));
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'fares'            => 'required|array',
            'fares.*.lga_id'   => 'required|exists:lgas,id',
            'fares.*.amount'   => 'required|numeric|min:0',
            'passcode'         => 'required|string',
        ]);

        if (!$this->passcodeValid($request)) {
            return back()->withErrors(['passcode' => 'Incorrect passcode.']);
        }

        foreach ($validated['fares'] as $fare) {
            LgaTransportFare::updateOrCreate(
                ['lga_id' => $fare['lga_id']],
                ['amount' => $fare['amount']]
            );
        }

        return back()->with('success', 'Transport fares updated.');
    }
}
