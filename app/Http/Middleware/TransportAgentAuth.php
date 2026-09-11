<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TransportAgentAuth
{
    public function handle(Request $request, Closure $next)
    {
        if (!Auth::guard('transport_agent')->check()) {
            return redirect()->route('transport-agent.login');
        }

        // Suspended mid-session: the check at login is not enough on its own,
        // or a revoked agent keeps working until they happen to log out.
        if (!Auth::guard('transport_agent')->user()->is_active) {
            Auth::guard('transport_agent')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('transport-agent.login')
                ->withErrors(['phone_number' => 'This account has been suspended. Contact the admin.']);
        }

        // Registered before the passport and ID were asked for: held at the
        // profile page until both are supplied, so the portal cannot be used
        // by someone whose identity was never captured. Only the profile
        // itself stays reachable, or there would be nowhere to comply.
        if (!Auth::guard('transport_agent')->user()->hasCompleteIdentity()
            && !$request->routeIs('transport-agent.profile*')) {
            return redirect()->route('transport-agent.profile')
                ->with('error', 'Add your passport photograph and a valid ID to continue using the portal.');
        }

        return $next($request);
    }
}
