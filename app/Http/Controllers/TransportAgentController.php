<?php

namespace App\Http\Controllers;

use App\Models\Lga;
use App\Models\State;
use App\Models\TransportAgent;
use App\Services\ImageCompressor;
use App\Services\PaystackService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
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

    public function __construct(
        private PaystackService $paystack,
        private ImageCompressor $images,
    ) {
    }

    /** The old single link, now offering the two streams. */
    public function choose()
    {
        return inertia('TransportAgent/Choose', [
            'categories' => TransportAgent::CATEGORIES,
        ]);
    }

    public function create(string $category)
    {
        return inertia('TransportAgent/Create', [
            'lgas'     => $this->osunLgas(),
            'zones'    => TransportAgent::ZONES,
            'branches' => TransportAgent::BRANCHES,
            // Fixed by the link they followed, never chosen on the form.
            'category' => TransportAgent::CATEGORIES[TransportAgent::categoryForSlug($category)],
            'slug'     => $category,
        ]);
    }

    public function store(Request $request, string $category)
    {
        $categoryKey = TransportAgent::categoryForSlug($category);

        $validated = $request->validate([
            'full_name'       => 'required|string|max:255',
            'phone_number'    => ['required', 'string', 'regex:/^\d{11}$/'],
            'whatsapp_number' => ['nullable', 'string', 'regex:/^\d{11}$/'],
            // The line they browse on — often a second SIM, so it is asked for
            // rather than assumed to be the phone number.
            'browsing_number' => ['required', 'string', 'regex:/^\d{11}$/'],
            'email'           => 'nullable|email|max:255',
            'zone'            => ['required', 'string', 'max:120', ...$this->listRule(TransportAgent::ZONES)],
            'branch_name'     => ['required', 'string', 'max:120', ...$this->listRule(TransportAgent::BRANCHES)],
            'gender'          => 'required|in:Male,Female',
            'address'         => 'nullable|string|max:255',
            'lga_id'          => ['required', Rule::exists('lgas', 'id')->where('state_id', $this->osunStateId())],
            'account_number'  => ['required', 'string', 'regex:/^\d{10}$/'],
            'bank_name'       => 'required|string|max:255',
            'bank_code'       => 'required|string|max:10',

            // Who they are. Taken with a camera or picked from the device —
            // either arrives here as an ordinary upload.
            'passport_photograph' => 'required|image|max:5120',
        ], [
            'phone_number.regex'    => 'Phone number must be exactly 11 digits.',
            'whatsapp_number.regex' => 'WhatsApp number must be exactly 11 digits.',
            'browsing_number.required' => 'Enter the number you browse with.',
            'browsing_number.regex'    => 'Browsing data number must be exactly 11 digits.',
            'zone.required'            => 'Choose your zone or group.',
            'branch_name.required'     => 'Choose your branch.',
            'account_number.regex'  => 'Account number must be exactly 10 digits.',
            'lga_id.exists'         => 'Choose your LGA from the list.',
            'bank_code.required'    => 'Select your bank from the list.',
            'passport_photograph.required' => 'Take or upload your passport photograph.',
            'passport_photograph.image'    => 'The passport photograph must be an image.',
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
            'browsing_number'   => $validated['browsing_number'],
            'email'             => $validated['email'] ?? null,
            'gender'            => $validated['gender'],
            'category'          => $categoryKey,
            'zone'              => $validated['zone'],
            'branch_name'       => $validated['branch_name'],
            'address'           => $validated['address'] ?? null,
            'lga_id'            => $lga->id,
            'lga_name'          => $lga->name,
            'account_number'    => $validated['account_number'],
            'bank_name'         => $validated['bank_name'],
            'bank_code'         => $validated['bank_code'],
            'bank_account_name' => $resolved['data']['account_name'] ?? null,
        ];

        // Stored only once everything above has passed, so a rejected
        // submission leaves no orphan files behind.
        $payload['passport_photograph_path'] = $this->storeFile($request, 'passport_photograph', $validated['phone_number'], 'passport', ImageCompressor::PORTRAIT);

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
            // So "register someone else" returns to the same link, rather than
            // asking a page that no longer exists which stream this was.
            'slug'         => $category,
            'category'     => TransportAgent::CATEGORIES[$categoryKey]['label'] ?? null,
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
     * one of them belongs to somebody else — saving would overwrite a
     * stranger's registration.
     *
     * @return array<string, string>|null
     */
    private function conflictingRegistration(array $validated): ?array
    {
        $matches = [
            'account_number' => TransportAgent::where('account_number', $validated['account_number'])->first(),
            'phone_number'   => TransportAgent::where('phone_number', $validated['phone_number'])->first(),
        ];

        $ids = collect($matches)->filter()->pluck('id')->unique();

        if ($ids->count() > 1) {
            return [
                'account_number' => 'This account number and phone number already belong to two different registrations. Check both, or contact the admin.',
            ];
        }

        return null;
    }

    /**
     * Restrict a field to a configured list — but only once there is one. While
     * the official zones and branches are still to come, the field is free text
     * rather than a dropdown with nothing in it.
     *
     * @return array<int, \Illuminate\Validation\Rules\In>
     */
    private function listRule(array $options): array
    {
        return $options === [] ? [] : [Rule::in(array_keys($options))];
    }

    /**
     * Filed under the phone number, which is unique per agent, so a person's
     * documents stay identifiable without their name in the filename.
     */
    private function storeFile(Request $request, string $field, string $phone, string $kind, int $maxEdge): ?string
    {
        if (!$request->hasFile($field)) {
            return null;
        }

        return $this->images->store(
            $request->file($field),
            'transport-agents',
            $phone . '-' . $kind . '-' . Str::random(6),
            $maxEdge
        );
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
