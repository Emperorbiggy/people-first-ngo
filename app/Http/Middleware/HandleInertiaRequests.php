<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'databoy' => optional(Auth::guard('databoy')->user())->load('ward', 'lga'),
            // The sidebar of the transport agent portal needs this on every
            // page; only the few fields it actually shows.
            'transportAgent' => Auth::guard('transport_agent')->check()
                ? Auth::guard('transport_agent')->user()->only(['id', 'full_name', 'phone_number', 'lga_name'])
                : null,
            'partyAgentRegistrationEnabled' => Auth::guard('databoy')->check()
                ? Setting::get('party_agent_registration_enabled', '1') === '1'
                : true,
            // The same switch that closes the public signup also closes vehicle
            // capture in the portal, so every page there can see it.
            'transportAgentRegistrationEnabled' => Auth::guard('transport_agent')->check()
                ? Setting::get('transport_agent_registration_enabled', '1') === '1'
                : true,
            'flash'   => [
                'success'         => session('success'),
                'error'           => session('error'),
                'checkoutFunding' => session('checkoutFunding'),
                // Phone numbers parsed from an uploaded contact list, handed
                // back for confirmation before any airtime is bought.
                'importedContacts' => session('importedContacts'),
                // Parsed APO/PO roster summary, shown for confirmation before
                // anything is written to the roster.
                'poPreview'        => session('poPreview'),
            ],
        ];
    }
}
