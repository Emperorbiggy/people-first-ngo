<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DataboyAuth
{
    /**
     * The only routes an APO accreditation officer may reach: accrediting APO
     * officers and taking attendance — their two jobs. No applications, no
     * party agents, no applicant accreditation, so everything else redirects
     * back to their accreditation page instead of 403-ing them into a dead end.
     */
    private const APO_OFFICER_ROUTES = [
        'databoy.apo-accreditation.index',
        'databoy.apo-accreditation.check-in',
        'databoy.apo-accreditation.check-out',
        'databoy.attendance.index',
        'databoy.attendance.toggle',
        'databoy.logout',
    ];

    public function handle(Request $request, Closure $next)
    {
        if (!Auth::guard('databoy')->check()) {
            return redirect()->route('databoy.login');
        }

        $databoy = Auth::guard('databoy')->user();

        if ($databoy->isApoAccreditationOfficer() && !in_array($request->route()?->getName(), self::APO_OFFICER_ROUTES, true)) {
            return redirect()->route('databoy.apo-accreditation.index');
        }

        return $next($request);
    }
}
