<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DataboyAuth
{
    public function handle(Request $request, Closure $next)
    {
        if (!Auth::guard('databoy')->check()) {
            return redirect()->route('databoy.login');
        }

        return $next($request);
    }
}
