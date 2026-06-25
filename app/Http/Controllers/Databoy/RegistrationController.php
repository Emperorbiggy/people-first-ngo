<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Models\Databoy;
use App\Models\Lga;
use App\Models\State;
use App\Models\Ward;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RegistrationController extends Controller
{
    public function showForm()
    {
        $states = State::orderBy('name')->get(['id', 'name']);
        return inertia('Databoy/Register', ['states' => $states]);
    }

    public function getLgas(State $state)
    {
        return response()->json(
            Lga::where('state_id', $state->id)->orderBy('name')->get(['id', 'name'])
        );
    }

    public function getAvailableWards(Lga $lga)
    {
        $takenIds = Databoy::whereNotNull('ward_id')->pluck('ward_id');
        return response()->json(
            Ward::where('lga_id', $lga->id)
                ->whereNotIn('id', $takenIds)
                ->orderBy('name')
                ->get(['id', 'name'])
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name'                         => 'required|string|max:255',
            'gender'                            => 'required|in:Male,Female',
            'age'                               => 'required|integer|min:18|max:60',
            'working_email'                     => 'required|email|max:255',
            'calling_phone_number'              => 'required|string|max:20',
            'whatsapp_number'                   => 'required|string|max:20',
            'state_id'                          => 'required|exists:states,id',
            'lga_id'                            => 'required|exists:lgas,id',
            'ward_id'                           => 'required|exists:wards,id|unique:databoys,ward_id',
            'house_address'                     => 'required|string',
            'browsing_network'                  => 'required|string|max:50',
            'browsing_number'                   => 'required|string|max:20',
            'bank_name'                         => 'required|string|max:255',
            'bank_code'                         => 'nullable|string|max:10',
            'account_number'                    => 'required|string|max:20',
            'bank_account_name'                 => 'required|string|max:255',
            'employment_status'                 => 'required|string|max:100',
            'availability'                      => 'nullable|string|max:100',
            'passport_photograph'               => 'required|extensions:jpg,jpeg,png|max:2048',
            'valid_id_card'                     => 'required|extensions:pdf,jpg,jpeg,png|max:5120',
            'highest_qualification_certificate' => 'required|extensions:pdf,jpg,jpeg,png|max:5120',
        ], [
            'ward_id.unique' => 'This ward already has a registered databoy.',
        ]);

        $state = State::find($validated['state_id']);

        $plainPassword = Str::random(10);
        $loginEmail    = $this->generateLoginEmail($validated['full_name']);

        $passportPath    = $this->storeFile($request->file('passport_photograph'), $validated['full_name'], 'passport');
        $idCardPath      = $this->storeFile($request->file('valid_id_card'), $validated['full_name'], 'id_card');
        $certificatePath = $this->storeFile($request->file('highest_qualification_certificate'), $validated['full_name'], 'certificate');

        Databoy::create([
            'full_name'                                => $validated['full_name'],
            'gender'                                   => $validated['gender'],
            'age'                                      => $validated['age'],
            'working_email'                            => $validated['working_email'],
            'calling_phone_number'                     => $validated['calling_phone_number'],
            'whatsapp_number'                          => $validated['whatsapp_number'],
            'state_of_residence'                       => $state->name,
            'state_id'                                 => $validated['state_id'],
            'lga_id'                                   => $validated['lga_id'],
            'ward_id'                                  => $validated['ward_id'],
            'house_address'                            => $validated['house_address'],
            'browsing_network'                         => $validated['browsing_network'],
            'browsing_number'                          => $validated['browsing_number'],
            'bank_name'                                => $validated['bank_name'],
            'bank_code'                                => $validated['bank_code'] ?? null,
            'account_number'                           => $validated['account_number'],
            'bank_account_name'                        => $validated['bank_account_name'],
            'employment_status'                        => $validated['employment_status'],
            'availability'                             => $validated['availability'] ?? null,
            'passport_photograph_path'                 => $passportPath,
            'valid_id_card_path'                       => $idCardPath,
            'highest_qualification_certificate_path'   => $certificatePath,
            'login_email'                              => $loginEmail,
            'login_password_plain'                     => $plainPassword,
            'password'                                 => Hash::make($plainPassword),
        ]);

        return redirect()->route('databoy.register.success', ['email' => $loginEmail, 'password' => $plainPassword]);
    }

    public function success(Request $request)
    {
        return inertia('Databoy/RegisterSuccess', [
            'login_email'    => $request->query('email'),
            'login_password' => $request->query('password'),
        ]);
    }

    private function generateLoginEmail(string $fullName): string
    {
        $firstName = strtolower(preg_replace('/[^a-zA-Z]/', '', explode(' ', trim($fullName))[0]));
        $email = "{$firstName}@peoplefirst.org";
        $i = 2;
        while (Databoy::where('login_email', $email)->exists()) {
            $email = "{$firstName}{$i}@peoplefirst.org";
            $i++;
        }
        return $email;
    }

    private function storeFile($file, string $name, string $type): string
    {
        $slug     = Str::slug($name);
        $rand     = rand(1000, 9999);
        $filename = "{$slug}_{$rand}_{$type}." . $file->getClientOriginalExtension();
        return $file->storeAs('databoy', $filename, 'public');
    }
}
