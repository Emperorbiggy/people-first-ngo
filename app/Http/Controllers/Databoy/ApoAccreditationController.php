<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Jobs\PayApoOfficerJob;
use App\Models\ApoOfficer;
use App\Models\Lga;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * APO accreditation — the same check-in/check-out method as applicant
 * accreditation, but the roster is only those qualified as APO officers, and
 * the result is written to the apo_officers row rather than the application.
 *
 * Only an apo_accreditation_officer may use this. Their login has nothing
 * else in it (see DataboyAuth).
 */
class ApoAccreditationController extends Controller
{
    /**
     * Kept in step with Databoy\AccreditationController::WINDOWS by hand. The
     * two flows deliberately do not share code so a change here can never
     * disturb applicant accreditation, which runs on the same day.
     */
    private const WINDOWS = [
        [
            'checkin_start'  => '07:00', 'checkin_end'  => '12:00',
            'checkout_start' => '12:00', 'checkout_end' => '15:00',
            'checkin_label'  => '7:00 AM–12:00 PM',
            'checkout_label' => '12:00 PM–3:00 PM',
        ],
        [
            'checkin_start'  => '14:00', 'checkin_end'  => '17:00',
            'checkout_start' => '17:00', 'checkout_end' => '23:59',
            'checkin_label'  => '2:00 PM–5:00 PM',
            'checkout_label' => '5:00 PM onward',
        ],
    ];

    /**
     * Accrediting an APO officer queues their payment, so it is restricted to
     * accreditation officers. A field databoy qualifies APO officers (on their
     * own APO Officers page) but never accredits or pays them.
     */
    private const CLOSED_MESSAGE = 'APO accreditation is currently closed by the admin.';

    private function authorizeOfficer(): void
    {
        abort_unless(Auth::guard('databoy')->user()?->isApoAccreditationOfficer(), 403,
            'Only an accreditation officer can accredit APO officers.');
    }

    public function index(Request $request)
    {
        $this->authorizeOfficer();

        $lgaId = $request->query('lga_id');

        $officers = $lgaId
            ? ApoOfficer::whereHas('application', fn ($q) => $q->where('lga_id', $lgaId))
                ->with([
                    'application:id,full_name,calling_phone_number,lga_id,ward_id,polling_unit_id',
                    'application.lga:id,name',
                    'application.ward:id,name',
                    'application.pollingUnit:id,name',
                ])
                ->get()
                ->sortBy(fn ($officer) => $officer->application->full_name ?? '')
                ->values()
                ->map(fn ($officer) => $this->present($officer))
            : collect();

        return inertia('Databoy/ApoAccreditation', [
            'officers'               => $officers,
            'lgas'                   => Lga::orderBy('name')->get(['id', 'name']),
            'selectedLgaId'          => $lgaId ? (int) $lgaId : null,
            'timeRestrictionEnabled' => $this->timeRestrictionEnabled(),
            'windows'                => $this->jsWindows(),
            'accreditationEnabled'   => $this->accreditationEnabled(),
        ]);
    }

    public function checkIn(Request $request, ApoOfficer $apoOfficer)
    {
        $this->authorizeOfficer();

        if (!$this->accreditationEnabled()) {
            return back()->withErrors(['suitable' => self::CLOSED_MESSAGE]);
        }

        if ($apoOfficer->checked_in_at) {
            return back()->withErrors(['suitable' => 'This APO officer is already checked in.']);
        }

        if ($this->timeRestrictionEnabled() && !$this->checkinWindow(now())) {
            $labels = collect(self::WINDOWS)->pluck('checkin_label')->implode(' or ');
            return back()->withErrors(['suitable' => "Check-in is only allowed between {$labels}."]);
        }

        $request->validate([
            'suitable' => 'required|boolean',
            'photo'    => 'required|image|max:5120',
        ]);

        $name = $apoOfficer->application->full_name ?? 'apo officer';
        $path = $request->file('photo')->storeAs('apo-accreditation', $this->photoFilename($name, 'checkin'), 'public');

        $apoOfficer->update([
            'is_suitable'         => $request->boolean('suitable'),
            'check_in_photo_path' => $path,
            'checked_in_at'       => now(),
        ]);

        return back()->with('success', "{$name} checked in.");
    }

    public function checkOut(Request $request, ApoOfficer $apoOfficer)
    {
        $this->authorizeOfficer();

        if (!$this->accreditationEnabled()) {
            return back()->withErrors(['photo' => self::CLOSED_MESSAGE]);
        }

        if (!$apoOfficer->checked_in_at) {
            return back()->withErrors(['photo' => 'This APO officer has not checked in yet.']);
        }

        if ($apoOfficer->checked_out_at) {
            return back()->withErrors(['photo' => 'This APO officer has already checked out.']);
        }

        if ($this->timeRestrictionEnabled()) {
            $window  = $this->checkinWindow($apoOfficer->checked_in_at);
            $sameDay = $apoOfficer->checked_in_at->isSameDay(now());

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

        $name = $apoOfficer->application->full_name ?? 'apo officer';
        $path = $request->file('photo')->storeAs('apo-accreditation', $this->photoFilename($name, 'checkout'), 'public');

        $apoOfficer->update([
            'check_out_photo_path'     => $path,
            'checked_out_at'           => now(),
            'is_accredited'            => true,
            'accredited_at'            => now(),
            // NOT ->id(): Databoy::getAuthIdentifierName() is 'login_email',
            // so the guard's id() hands back the email, not the primary key.
            'accredited_by_databoy_id' => Auth::guard('databoy')->user()->id,
        ]);

        $suffix = '';

        if ($this->paymentEnabled()) {
            // Safe to dispatch unconditionally: the job claims an exclusive
            // database lock before paying, so even a duplicate dispatch of
            // this same officer results in exactly one payment.
            PayApoOfficerJob::dispatch($apoOfficer->id);
            $suffix = ' Payment queued.';
        }

        return back()->with('success', "{$name} checked out and has been accredited as an APO officer.{$suffix}");
    }

    private function present(ApoOfficer $officer): array
    {
        return [
            'id'                   => $officer->id,
            'full_name'            => $officer->application->full_name ?? '—',
            'calling_phone_number' => $officer->application->calling_phone_number ?? '—',
            'lga'                  => $officer->application->lga->name ?? '—',
            'ward'                 => $officer->application->ward->name ?? '—',
            'polling_unit'         => $officer->application->pollingUnit->name ?? '—',
            'is_suitable'          => $officer->is_suitable,
            'checked_in_at'        => $officer->checked_in_at,
            'checked_out_at'       => $officer->checked_out_at,
            'is_accredited'        => $officer->is_accredited,
            'accredited_at'        => $officer->accredited_at,
            'check_in_photo_path'  => $officer->check_in_photo_path,
        ];
    }

    private function timeRestrictionEnabled(): bool
    {
        return Setting::get('accreditation_time_restriction_enabled', '1') === '1';
    }

    /**
     * Master switch from Settings. Checked here as well as in the UI — a
     * greyed-out button is a courtesy, not a control.
     */
    private function accreditationEnabled(): bool
    {
        return Setting::get('apo_accreditation_enabled', '1') === '1';
    }

    private function paymentEnabled(): bool
    {
        return Setting::get('apo_payment_enabled', '1') === '1';
    }

    private function checkinWindow(Carbon $at): ?array
    {
        $time = $at->format('H:i');

        foreach (self::WINDOWS as $window) {
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

    private function jsWindows(): array
    {
        return array_map(fn ($w) => [
            'checkinStart'  => $this->toMinutes($w['checkin_start']),
            'checkinEnd'    => $this->toMinutes($w['checkin_end']),
            'checkoutStart' => $this->toMinutes($w['checkout_start']),
            'checkoutEnd'   => $this->toMinutes($w['checkout_end']),
            'checkinLabel'  => $w['checkin_label'],
            'checkoutLabel' => $w['checkout_label'],
        ], self::WINDOWS);
    }

    private function toMinutes(string $hm): int
    {
        [$h, $m] = explode(':', $hm);

        return ((int) $h) * 60 + (int) $m;
    }

    private function photoFilename(string $fullName, string $type): string
    {
        $cleanName = strtolower(preg_replace('/\s+/', ' ', trim($fullName)));

        return "{$cleanName} " . rand(1000, 9999) . " apo {$type}.jpg";
    }
}
