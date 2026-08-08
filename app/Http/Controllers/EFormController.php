<?php

namespace App\Http\Controllers;

use App\Models\EForm;
use App\Models\Lga;
use App\Models\State;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Public e-form. Training happens across Osun, so the LGA list is fixed to
 * that state's LGAs.
 */
class EFormController extends Controller
{
    private const STATE_NAME = 'Osun';

    public function create()
    {
        return inertia('EForm/Create', [
            'lgas' => $this->osunLgas(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'application_id' => 'required|string|max:100',
            'full_name'      => 'required|string|max:255',
            'phone_number'   => ['required', 'string', 'regex:/^\d{11}$/'],
            'lga_id'         => ['required', Rule::exists('lgas', 'id')->where('state_id', $this->osunStateId())],
            'gender'         => 'required|in:Male,Female',
            'account_number' => ['required', 'string', 'regex:/^\d{10}$/'],
            'bank_name'      => 'required|string|max:255',
            'bank_code'      => 'nullable|string|max:10',
        ], [
            'phone_number.regex'   => 'Phone number must be exactly 11 digits.',
            'account_number.regex' => 'Account number must be exactly 10 digits.',
            'lga_id.exists'        => 'Choose an LGA of training from the list.',
        ]);

        $lga = Lga::find($validated['lga_id']);

        // Submitting again with the same application ID corrects the earlier
        // entry instead of leaving two records that disagree.
        EForm::updateOrCreate(
            ['application_id' => trim($validated['application_id'])],
            [
                'full_name'       => $validated['full_name'],
                'phone_number'    => $validated['phone_number'],
                'lga_id'          => $lga->id,
                'lga_of_training' => $lga->name,
                'gender'          => $validated['gender'],
                'account_number'  => $validated['account_number'],
                'bank_name'       => $validated['bank_name'],
                'bank_code'       => $validated['bank_code'] ?? null,
            ]
        );

        return redirect()->route('e-form.success');
    }

    public function success()
    {
        return inertia('EForm/Success');
    }

    private function osunStateId(): ?int
    {
        return State::where('name', 'like', '%' . self::STATE_NAME . '%')->value('id');
    }

    private function osunLgas()
    {
        return Lga::where('state_id', $this->osunStateId())
            ->orderBy('name')
            ->get(['id', 'name']);
    }
}
