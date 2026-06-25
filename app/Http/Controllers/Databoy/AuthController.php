<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function showLogin()
    {
        if (Auth::guard('databoy')->check()) {
            return redirect()->route('databoy.dashboard');
        }
        return inertia('Databoy/Login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|string',
            'password' => 'required|string',
        ]);

        $credentials = [
            'login_email' => $request->email,
            'password'    => $request->password,
        ];

        if (Auth::guard('databoy')->attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();
            return redirect()->route('databoy.dashboard');
        }

        return back()->withErrors(['email' => 'Invalid email or password.'])->onlyInput('email');
    }

    public function logout(Request $request)
    {
        Auth::guard('databoy')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('databoy.login');
    }
}
