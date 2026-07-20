<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Jobs\PayAccreditedApplicantJob;
use App\Jobs\PayDataboyAccreditationJob;
use App\Models\DataboyApplication;
use App\Models\Lga;
use App\Models\Setting;
use App\Models\WardTimeOverride;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AccreditationController extends Controller
{
    /**
     * Check-in is only allowed inside a window's check-in range. Checkout for
     * that same check-in is only allowed inside the PAIRED checkout range
     * (a later, separate window), on the same calendar day as check-in.
     */
    private const WINDOWS = [
        [
            'checkin_start'  => '07:00', 'checkin_end'  => '12:00',
            'checkout_start' => '12:00', 'checkout_end' => '15:00',
            'checkin_label'  => '7:00 AM–12:00 PM',
            'checkout_label' => '12:00 PM–3:00 PM',
        ],
        [
            'checkin_start'  => '15:00', 'checkin_end'  => '17:00',
            'checkout_start' => '17:00', 'checkout_end' => '23:59',
            'checkin_label'  => '3:00 PM–5:00 PM',
            'checkout_label' => '5:00 PM onward',
        ],
    ];

    public function index(Request $request)
    {
        $databoy = Auth::guard('databoy')->user();

        if ($databoy->isAccreditationBoy()) {
            $lgaId = $request->query('lga_id');

            $applications = $lgaId
                ? DataboyApplication::where('lga_id', $lgaId)
                    ->with('ward:id,name')
                    ->orderBy('full_name')
                    ->get([
                        'id', 'full_name', 'calling_phone_number', 'ward_id',
                        'is_suitable', 'check_in_photo_path', 'checked_in_at',
                        'checked_out_at', 'is_accredited', 'accredited_at',
                    ])
                    ->map(fn ($app) => $this->attachWindows($app))
                : collect();

            return inertia('Databoy/Accreditation', [
                'applications'           => $applications,
                'timeRestrictionEnabled' => $this->timeRestrictionEnabled(),
                'defaultWindows'         => $this->jsWindows(self::WINDOWS),
                'role'                   => 'accreditation_boy',
                'lgas'                   => Lga::orderBy('name')->get(['id', 'name']),
                'selectedLgaId'          => $lgaId ? (int) $lgaId : null,
            ]);
        }

        $applications = DataboyApplication::where('registered_by', $databoy->id)
            ->orderBy('full_name')
            ->get([
                'id', 'full_name', 'calling_phone_number', 'ward_id',
                'is_suitable', 'check_in_photo_path', 'checked_in_at',
                'checked_out_at', 'is_accredited', 'accredited_at',
            ])
            ->map(fn ($app) => $this->attachWindows($app, $databoy->ward_id));

        return inertia('Databoy/Accreditation', [
            'applications'           => $applications,
            'timeRestrictionEnabled' => $this->timeRestrictionEnabled(),
            'defaultWindows'         => $this->jsWindows($this->windowsForWard($databoy->ward_id, now())),
            'role'                   => 'databoy',
        ]);
    }

    public function checkIn(Request $request, DataboyApplication $databoyApplication)
    {
        $databoy = Auth::guard('databoy')->user();
        abort_if(!$databoy->isAccreditationBoy() && $databoyApplication->registered_by !== $databoy->id, 403);

        if ($databoyApplication->checked_in_at) {
            return back()->withErrors(['suitable' => 'This applicant is already checked in.']);
        }

        if ($this->timeRestrictionEnabled() && !$this->checkinWindow(now(), $databoyApplication->ward_id)) {
            $labels = collect($this->windowsForWard($databoyApplication->ward_id, now()))->pluck('checkin_label')->implode(' or ');
            return back()->withErrors(['suitable' => "Check-in is only allowed between {$labels}."]);
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
        abort_if(!$databoy->isAccreditationBoy() && $databoyApplication->registered_by !== $databoy->id, 403);

        if (!$databoyApplication->checked_in_at) {
            return back()->withErrors(['photo' => 'This applicant has not checked in yet.']);
        }

        if ($databoyApplication->checked_out_at) {
            return back()->withErrors(['photo' => 'This applicant has already checked out.']);
        }

        if ($this->timeRestrictionEnabled()) {
            $window  = $this->checkinWindow($databoyApplication->checked_in_at, $databoyApplication->ward_id);
            $sameDay = $databoyApplication->checked_in_at->isSameDay(now());

            if (!$window || !$sameDay || !$this->withinCheckoutRange($window, now())) {
                $label = $window ? $window['checkout_label'] : 'the correct checkout window';
                return back()->withErrors(['photo' => "Checkout is only allowed between {$label} (based on the check-in time), on the same day."]);
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
            PayDataboyAccreditationJob::dispatch($databoy->id);
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

    private function checkinWindow(Carbon $at, ?int $wardId = null): ?array
    {
        $time = $at->format('H:i');

        foreach ($this->windowsForWard($wardId, $at) as $window) {
            if ($time >= $window['checkin_start'] && $time <= $window['checkin_end']) {
                return $window;
            }
        }

        return null;
    }

    private function withinCheckoutRange(array $window, Carbon $at): bool
    {
        $time = $at->format('H:i');

        return $time >= $window['checkout_start'] && $time <= $window['checkout_end'];
    }

    /**
     * A ward can have a one-off override for "today" (set by admin when a ward
     * arrives late) which replaces the default two windows entirely.
     */
    private function windowsForWard(?int $wardId, Carbon $at): array
    {
        if ($wardId) {
            $override = WardTimeOverride::where('ward_id', $wardId)
                ->whereDate('override_date', $at->toDateString())
                ->first();

            if ($override) {
                return [[
                    'checkin_start'  => $override->checkin_start,
                    'checkin_end'    => $override->checkin_end,
                    'checkout_start' => $override->checkout_start,
                    'checkout_end'   => $override->checkout_end,
                    'checkin_label'  => $this->formatRange($override->checkin_start, $override->checkin_end),
                    'checkout_label' => $this->formatRange($override->checkout_start, $override->checkout_end),
                ]];
            }
        }

        return self::WINDOWS;
    }

    private function formatRange(string $start, string $end): string
    {
        return Carbon::createFromFormat('H:i', $start)->format('g:i A') . '–' . Carbon::createFromFormat('H:i', $end)->format('g:i A');
    }

    private function attachWindows(DataboyApplication $app, ?int $fallbackWardId = null): DataboyApplication
    {
        $wardId = $app->ward_id ?? $fallbackWardId;
        $app->windows = $this->jsWindows($this->windowsForWard($wardId, now()));

        return $app;
    }

    private function jsWindows(array $windows): array
    {
        return array_map(fn ($w) => [
            'checkinStart'  => $this->toMinutes($w['checkin_start']),
            'checkinEnd'    => $this->toMinutes($w['checkin_end']),
            'checkoutStart' => $this->toMinutes($w['checkout_start']),
            'checkoutEnd'   => $this->toMinutes($w['checkout_end']),
            'checkinLabel'  => $w['checkin_label'],
            'checkoutLabel' => $w['checkout_label'],
        ], $windows);
    }

    private function toMinutes(string $hm): int
    {
        [$h, $m] = explode(':', $hm);

        return ((int) $h) * 60 + (int) $m;
    }

    private function photoFilename(string $fullName, string $type): string
    {
        $cleanName = strtolower(preg_replace('/\s+/', ' ', trim($fullName)));
        $rand      = rand(1000, 9999);

        return "{$cleanName} {$rand} {$type}.jpg";
    }
}
