<?php

namespace App\Http\Controllers;

use App\Models\Lga;
use App\Models\State;
use App\Models\TransportAgent;
use App\Services\PaystackService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Public registration for the agents who will go out and register
 * transportation vehicles and their owners.
 *
 * Collects the agent's own details only. LGA is the whole geography — the work
 * is assigned by local government, so no ward or polling unit is asked for.
 */
class TransportAgentController extends Controller
{
    private const STATE_NAME = 'Osun';

    public function __construct(private PaystackService $paystack)
    {
    }

    public function create()
    {
        return inertia('TransportAgent/Create', [
            'lgas' => $this->osunLgas(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name'       => 'required|string|max:255',
            'phone_number'    => ['required', 'string', 'regex:/^\d{11}$/'],
            'whatsapp_number' => ['nullable', 'string', 'regex:/^\d{11}$/'],
            'email'           => 'nullable|email|max:255',
            'gender'          => 'required|in:Male,Female',
            'address'         => 'nullable|string|max:255',
            'lga_id'          => ['required', Rule::exists('lgas', 'id')->where('state_id', $this->osunStateId())],
            'account_number'  => ['required', 'string', 'regex:/^\d{10}$/'],
            'bank_name'       => 'required|string|max:255',
            'bank_code'       => 'required|string|max:10',
        ], [
            'phone_number.regex'    => 'Phone number must be exactly 11 digits.',
            'whatsapp_number.regex' => 'WhatsApp number must be exactly 11 digits.',
            'account_number.regex'  => 'Account number must be exactly 10 digits.',
            'lga_id.exists'         => 'Choose your LGA from the list.',
            'bank_code.required'    => 'Select your bank from the list.',
        ]);

        // Verify the account here on the server. The browser already showed the
        // name for confidence, but that value is never trusted — money follows
        // these details, so the authoritative check is ours.
        $resolved = $this->paystack->resolveAccountNumber(
            $validated['account_number'],
            $validated['bank_code']
        );

        if (!($resolved['status'] ?? false)) {
            return back()
                ->withInput()
                ->withErrors(['account_number' => $resolved['message'] ?? 'That account number could not be verified with the bank. Check the number and bank, then try again.']);
        }

        // The account belongs to somebody else's registration, or the phone
        // does — either way this is a different person claiming a taken
        // identifier, not the same person correcting their own entry.
        if ($clash = $this->conflictingRegistration($validated)) {
            return back()->withInput()->withErrors($clash);
        }

        $lga = Lga::find($validated['lga_id']);

        // Registering again with the same account number or phone corrects that
        // record rather than leaving two that disagree.
        $existing = TransportAgent::where('account_number', $validated['account_number'])
            ->orWhere('phone_number', $validated['phone_number'])
            ->first();

        $payload = [
            'full_name'         => $validated['full_name'],
            'phone_number'      => $validated['phone_number'],
            'whatsapp_number'   => $validated['whatsapp_number'] ?? null,
            'email'             => $validated['email'] ?? null,
            'gender'            => $validated['gender'],
            'address'           => $validated['address'] ?? null,
            'lga_id'            => $lga->id,
            'lga_name'          => $lga->name,
            'account_number'    => $validated['account_number'],
            'bank_name'         => $validated['bank_name'],
            'bank_code'         => $validated['bank_code'],
            'bank_account_name' => $resolved['data']['account_name'] ?? null,
        ];

        if ($existing) {
            // Re-registering corrects details but never resets a password they
            // may already be using.
            $existing->update($payload);
            $agent = $existing->fresh();
        } else {
            // Six digits: short enough to read off a screen and type on a
            // phone, and it is shown once here and then only to an admin.
            $password = (string) random_int(100000, 999999);

            $agent = TransportAgent::create($payload + [
                'login_password_plain' => $password,
                'password'             => Hash::make($password),
                'role'                 => 'transport_agent',
                'is_active'            => true,
            ]);
        }

        return redirect()->route('transport-agent.success')->with('registered', [
            'name'         => $agent->full_name,
            'lga'          => $lga->name,
            'account_name' => $agent->bank_account_name,
            'updated'      => (bool) $existing,
            'phone'        => $agent->phone_number,
            // Only ever handed back on a fresh registration — an update must
            // not reveal the password to whoever is at the keyboard.
            'password'     => $existing ? null : $agent->getRawOriginal('login_password_plain'),
        ]);
    }

    public function success()
    {
        return inertia('TransportAgent/Success', [
            'registered' => session('registered'),
        ]);
    }

    /**
     * Where the account and the phone point at two DIFFERENT existing records,
     * one of them belongs to somebody else — updating either would overwrite a
     * stranger's registration.
     *
     * @return array<string, string>|null
     */
    private function conflictingRegistration(array $validated): ?array
    {
        $byAccount = TransportAgent::where('account_number', $validated['account_number'])->first();
        $byPhone   = TransportAgent::where('phone_number', $validated['phone_number'])->first();

        if ($byAccount && $byPhone && $byAccount->id !== $byPhone->id) {
            return [
                'account_number' => 'This account number and phone number already belong to two different registrations. Check both, or contact the admin.',
            ];
        }

        return null;
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
