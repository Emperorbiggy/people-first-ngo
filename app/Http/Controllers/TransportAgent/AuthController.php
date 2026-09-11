<?php

namespace App\Http\Controllers\TransportAgent;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Transport agent sign-in. They authenticate with the phone number they
 * registered with and the password issued at registration.
 */
class AuthController extends Controller
{
    public function showLogin()
    {
        if (Auth::guard('transport_agent')->check()) {
            return redirect()->route('transport-agent.dashboard');
        }

        return inertia('TransportAgent/Login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'phone_number' => 'required|string',
            'password'     => 'required|string',
        ]);

        // Digits only: someone typing +234… or spacing their number should not
        // be told their credentials are wrong.
        $phone = preg_replace('/\D/', '', $request->phone_number);

        if (str_starts_with($phone, '234') && strlen($phone) === 13) {
            $phone = '0' . substr($phone, 3);
        }

        $credentials = [
            'phone_number' => $phone,
            'password'     => $request->password,
        ];

        if (!Auth::guard('transport_agent')->attempt($credentials, $request->boolean('remember'))) {
            return back()
                ->withErrors(['phone_number' => 'Invalid phone number or password.'])
                ->onlyInput('phone_number');
        }

        $agent = Auth::guard('transport_agent')->user();

        // A suspended account authenticates but must not get a session.
        if (!$agent->is_active) {
            Auth::guard('transport_agent')->logout();

            return back()->withErrors([
                'phone_number' => 'This account has been suspended. Contact the admin.',
            ])->onlyInput('phone_number');
        }

        $agent->forceFill(['last_login_at' => now()])->save();

        $request->session()->regenerate();

        return redirect()->route('transport-agent.dashboard');
    }

    public function logout(Request $request)
    {
        Auth::guard('transport_agent')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('transport-agent.login');
    }
}
