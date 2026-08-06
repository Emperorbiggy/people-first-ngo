<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Support\Facades\Auth;

/**
 * Both accrediting roles have a second job: taking attendance. Accreditation
 * boys accredit applicants, APO accreditation officers accredit APO officers,
 * and either may mark the register. A plain databoy may not.
 */
class AttendanceController extends Controller
{
    public function index()
    {
        $this->authorizeAttendanceTaker();

        $attendees = Attendance::orderBy('surname')->orderBy('firstname')
            ->get(['id', 'surname', 'firstname', 'othernames', 'lga', 'phone_number', 'present', 'marked_present_at']);

        return inertia('Databoy/Attendance', [
            'attendees' => $attendees,
            'lgas'      => $attendees->pluck('lga')->filter()->unique()->sort()->values(),
            'stats'     => [
                'total'   => $attendees->count(),
                'present' => $attendees->where('present', true)->count(),
                'absent'  => $attendees->where('present', false)->count(),
            ],
        ]);
    }

    public function toggle(Attendance $attendance)
    {
        $this->authorizeAttendanceTaker();

        $nowPresent = !$attendance->present;

        $attendance->update([
            'present'           => $nowPresent,
            'marked_present_at' => $nowPresent ? now() : null,
        ]);

        return back()->with('success', $nowPresent
            ? "{$attendance->name} marked present."
            : "{$attendance->name} is no longer marked present.");
    }

    private function authorizeAttendanceTaker(): void
    {
        $databoy = Auth::guard('databoy')->user();

        abort_unless(
            $databoy?->isAccreditationBoy() || $databoy?->isApoAccreditationOfficer(),
            403
        );
    }
}
