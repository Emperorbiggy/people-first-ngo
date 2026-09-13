<?php

namespace App\Http\Controllers\TransportAgent;

use App\Http\Controllers\Controller;
use App\Models\RegisteredVehicle;
use App\Models\TransportAgent;
use App\Services\ImageCompressor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * The agent's own profile: contact details they may change themselves, and
 * their password.
 *
 * Bank details and LGA are deliberately read-only here — money follows the
 * account, and the posting is an assignment, not a preference. Both go through
 * an admin.
 */
class ProfileController extends Controller
{
    public function __construct(private ImageCompressor $images)
    {
    }

    public function index()
    {
        $agent = $this->agent();

        return inertia('TransportAgent/Profile', [
            'agent' => [
                'full_name'         => $agent->full_name,
                'phone_number'      => $agent->phone_number,
                'whatsapp_number'   => $agent->whatsapp_number,
                'browsing_number'   => $agent->browsing_number,
                'category_label'    => $agent->category_label,
                'zone'              => $agent->zone,
                'branch_name'       => $agent->branch_name,
                'email'             => $agent->email,
                'gender'            => $agent->gender,
                'address'           => $agent->address,
                'lga_name'          => $agent->lga_name,
                'bank_name'         => $agent->bank_name,
                'account_number'    => $agent->account_number,
                'bank_account_name' => $agent->bank_account_name,
                'registered_at'     => $agent->created_at,
                'last_login_at'     => $agent->last_login_at,

                'id_type'                 => $agent->id_type,
                'id_type_label'           => $agent->id_type_label,
                'id_number'               => $agent->id_number,
                'passport_photograph_url' => $agent->passport_photograph_url,
                'id_document_url'         => $agent->id_document_url,
            ],
            'idTypes'          => TransportAgent::ID_TYPES,
            // Drives the banner and decides whether the rest of the portal is
            // reachable; the middleware enforces the same thing.
            'identityComplete' => $agent->hasCompleteIdentity(),
            'stats' => [
                'total' => RegisteredVehicle::where('transport_agent_id', $agent->id)->count(),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $agent = $this->agent();

        $validated = $request->validate([
            'full_name'       => 'required|string|max:255',
            'whatsapp_number' => ['nullable', 'string', 'regex:/^\d{11}$/'],
            'browsing_number' => ['nullable', 'string', 'regex:/^\d{11}$/'],
            'email'           => ['nullable', 'email', 'max:255'],
            'address'         => 'nullable|string|max:255',
        ], [
            'whatsapp_number.regex' => 'WhatsApp number must be exactly 11 digits.',
            'browsing_number.regex' => 'Browsing data number must be exactly 11 digits.',
        ]);

        $agent->update($validated);

        return back()->with('success', 'Your details have been updated.');
    }

    public function updatePassword(Request $request)
    {
        $agent = $this->agent();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:6|max:255|confirmed',
        ]);

        if (!Hash::check($validated['current_password'], $agent->getRawOriginal('password'))) {
            return back()->withErrors(['current_password' => 'That is not your current password.']);
        }

        $agent->update([
            'password' => Hash::make($validated['password']),
            // Kept in step with the hash so an admin can still read back a
            // credential for someone who is locked out.
            'login_password_plain' => $validated['password'],
        ]);

        return back()->with('success', 'Your password has been changed.');
    }

    /**
     * The passport photograph and government ID, supplied after the fact by an
     * agent who registered before either was asked for.
     *
     * What they already have is optional here, so the same form doubles as a
     * way to replace a bad photograph later; what is missing is required.
     */
    public function updateIdentity(Request $request)
    {
        $agent = $this->agent();

        $needsPassport = blank($agent->passport_photograph_path);
        $needsId       = blank($agent->id_document_path);
        $needsIdDetail = blank($agent->id_type) || blank($agent->id_number);

        $validated = $request->validate([
            'passport_photograph' => [$needsPassport ? 'required' : 'nullable', 'image', 'max:5120'],
            'id_type'             => [$needsIdDetail ? 'required' : 'nullable', Rule::in(array_keys(TransportAgent::ID_TYPES))],
            'id_number'           => [
                $needsIdDetail ? 'required' : 'nullable',
                'string',
                'max:50',
                // One ID, one agent — the same rule the public form enforces.
                Rule::unique('transport_agents', 'id_number')->ignore($agent->id),
            ],
            'id_document'         => [$needsId ? 'required' : 'nullable', 'image', 'max:5120'],
        ], [
            'passport_photograph.required' => 'Take or upload your passport photograph.',
            'id_type.required'             => 'Choose the type of ID you are providing.',
            'id_number.required'           => 'Enter the number on the ID you selected.',
            'id_number.unique'             => 'That ID number is already registered to another agent. Contact the admin.',
            'id_document.required'         => 'Take or upload a picture of your ID.',
        ]);

        $changes = [];

        if (filled($validated['id_type'] ?? null)) {
            $changes['id_type'] = $validated['id_type'];
        }

        if (filled($validated['id_number'] ?? null)) {
            $changes['id_number'] = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $validated['id_number']));
        }

        if ($request->hasFile('passport_photograph')) {
            $changes['passport_photograph_path'] = $this->images->store(
                $request->file('passport_photograph'),
                'transport-agents',
                $agent->phone_number . '-passport-' . Str::random(6),
                ImageCompressor::PORTRAIT
            );
        }

        if ($request->hasFile('id_document')) {
            $changes['id_document_path'] = $this->images->store(
                $request->file('id_document'),
                'transport-agents',
                $agent->phone_number . '-id-' . Str::random(6),
                ImageCompressor::DOCUMENT
            );
        }

        $agent->update($changes);

        return redirect()->route('transport-agent.dashboard')
            ->with('success', 'Thank you — your photograph and ID have been saved.');
    }

    private function agent(): TransportAgent
    {
        return Auth::guard('transport_agent')->user();
    }
}
