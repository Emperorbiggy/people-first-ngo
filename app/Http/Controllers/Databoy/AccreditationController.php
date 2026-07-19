<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Jobs\PayAccreditedApplicantJob;
use App\Models\DataboyApplication;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AccreditationController extends Controller
{
    /**
     * Check-in/check-out is only allowed inside these windows, and a checkout
     * must land in the SAME window the check-in happened in (same calendar day).
     */
    private const WINDOWS = [
        ['start' => '09:00', 'end' => '12:00'],
        ['start' => '15:00', 'end' => '18:00'],
    ];

    public function index()
    {
        $databoy = Auth::guard('databoy')->user();

        $applications = DataboyApplication::where('registered_by', $databoy->id)
            ->orderBy('full_name')
            ->get([
                'id', 'full_name', 'calling_phone_number',
                'is_suitable', 'check_in_photo_path', 'checked_in_at',
                'checked_out_at', 'is_accredited', 'accredited_at',
            ]);

        return inertia('Databoy/Accreditation', [
            'applications'           => $applications,
            'timeRestrictionEnabled' => $this->timeRestrictionEnabled(),
        ]);
    }

    public function checkIn(Request $request, DataboyApplication $databoyApplication)
    {
        $databoy = Auth::guard('databoy')->user();
        abort_if($databoyApplication->registered_by !== $databoy->id, 403);

        if ($databoyApplication->checked_in_at) {
            return back()->withErrors(['suitable' => 'This applicant is already checked in.']);
        }

        if ($this->timeRestrictionEnabled() && !$this->currentWindow(now())) {
            return back()->withErrors(['suitable' => 'Check-in is only allowed between 9:00 AM–12:00 PM or 3:00 PM–6:00 PM.']);
        }

        $request->validate([
            'suitable' => 'required|boolean',
            'photo'    => 'required|image|max:5120',
        ]);

        $filename = $this->photoFilename($databoyApplication->full_name, 'checkin');
        $path     = $request->file('photo')->storeAs('databoy-applications', $filename, 'public');

        $isSuitable = $request->boolean('suitable');

        $databoyApplication->update([
            'is_suitable'         => $isSuitable,
            'check_in_photo_path' => $path,
            'checked_in_at'       => now(),
        ]);

        $verdict = $isSuitable ? 'suitable for APO/Monitoring' : 'not suitable for APO/Monitoring';
        return back()->with('success', "{$databoyApplication->full_name} checked in ({$verdict}).");
    }

    public function checkOut(Request $request, DataboyApplication $databoyApplication)
    {
        $databoy = Auth::guard('databoy')->user();
        abort_if($databoyApplication->registered_by !== $databoy->id, 403);

        if (!$databoyApplication->checked_in_at) {
            return back()->withErrors(['photo' => 'This applicant has not checked in yet.']);
        }

        if ($databoyApplication->checked_out_at) {
            return back()->withErrors(['photo' => 'This applicant has already checked out.']);
        }

        if ($this->timeRestrictionEnabled()) {
            $checkInWindow = $this->currentWindow($databoyApplication->checked_in_at);
            $nowWindow     = $this->currentWindow(now());
            $sameDay       = $databoyApplication->checked_in_at->isSameDay(now());

            if (!$checkInWindow || !$nowWindow || $checkInWindow !== $nowWindow || !$sameDay) {
                $label = $checkInWindow ? "{$checkInWindow['start']}–{$checkInWindow['end']}" : 'their check-in window';
                return back()->withErrors(['photo' => "Checkout must happen within the same window as check-in ({$label}), on the same day."]);
            }
        }

        $request->validate([
            'photo' => 'required|image|max:5120',
            'match' => 'required|boolean',
        ]);

        if (!$request->boolean('match')) {
            return back()->withErrors(['photo' => 'The checkout photo does not match the check-in photo. Please retake it.']);
        }

        $filename = $this->photoFilename($databoyApplication->full_name, 'checkout');
        $path     = $request->file('photo')->storeAs('databoy-applications', $filename, 'public');

        $databoyApplication->update([
            'check_out_photo_path'     => $path,
            'checked_out_at'           => now(),
            'is_accredited'            => true,
            'accredited_at'            => now(),
            'accredited_by'            => null,
            'accredited_by_databoy_id' => $databoy->id,
        ]);

        if ($this->paymentEnabled()) {
            PayAccreditedApplicantJob::dispatch($databoyApplication->id);
            $suffix = ' Payment queued.';
        } else {
            $suffix = '';
        }

        return back()->with('success', "{$databoyApplication->full_name} checked out and has been accredited.{$suffix}");
    }

    private function timeRestrictionEnabled(): bool
    {
        return Setting::get('accreditation_time_restriction_enabled', '1') === '1';
    }

    private function paymentEnabled(): bool
    {
        return Setting::get('accreditation_payment_enabled', '1') === '1';
    }

    private function currentWindow(Carbon $at): ?array
    {
        $time = $at->format('H:i');

        foreach (self::WINDOWS as $window) {
            if ($time >= $window['start'] && $time <= $window['end']) {
                return $window;
            }
        }

        return null;
    }

    private function photoFilename(string $fullName, string $type): string
    {
        $cleanName = strtolower(preg_replace('/\s+/', ' ', trim($fullName)));
        $rand      = rand(1000, 9999);

        return "{$cleanName} {$rand} {$type}.jpg";
    }
}
