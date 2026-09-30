<?php

namespace App\Http\Controllers\TransportAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/** Sign-in for the transport panel. Email and password. */
class AuthController extends Controller
{
    public function showLogin()
    {
        if (Auth::guard('transport_admin')->check()) {
            return redirect()->route('transport-admin.dashboard');
        }

        return inertia('TransportAdmin/Login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $credentials = [
            'email'    => strtolower(trim($request->email)),
            'password' => $request->password,
        ];

        if (!Auth::guard('transport_admin')->attempt($credentials, $request->boolean('remember'))) {
            return back()
                ->withErrors(['email' => 'Invalid email or password.'])
                ->onlyInput('email');
        }

        $admin = Auth::guard('transport_admin')->user();

        // A suspended account authenticates but must not get a session.
        if (!$admin->is_active) {
            Auth::guard('transport_admin')->logout();

            return back()
                ->withErrors(['email' => 'This account has been suspended.'])
                ->onlyInput('email');
        }

        $admin->forceFill(['last_login_at' => now()])->save();

        $request->session()->regenerate();

        return redirect()->route('transport-admin.dashboard');
    }

    public function logout(Request $request)
    {
        Auth::guard('transport_admin')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('transport-admin.login');
    }
}
