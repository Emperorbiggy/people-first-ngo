<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TransportAdminAuth
{
    public function handle(Request $request, Closure $next)
    {
        if (!Auth::guard('transport_admin')->check()) {
            return redirect()->route('transport-admin.login');
        }

        // Suspended mid-session: the check at login is not enough on its own,
        // or a revoked account keeps working until it happens to log out.
        if (!Auth::guard('transport_admin')->user()->is_active) {
            Auth::guard('transport_admin')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('transport-admin.login')
                ->withErrors(['email' => 'This account has been suspended.']);
        }

        return $next($request);
    }
}
