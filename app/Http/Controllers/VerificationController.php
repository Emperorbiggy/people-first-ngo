<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Models\ImportedContractApplication;
use App\Models\ApplicationToken;
use App\Models\NgoContractApplication;

class VerificationController extends Controller
{
    private const OSUN_LGAS = [
        'Aiyedade','Aiyedire','Atakumosa East','Atakumosa West','Boluwaduro','Boripe',
        'Ede North','Ede South','Egbedore','Ejigbo','Ife Central','Ife East','Ife North',
        'Ife South','Ifedayo','Ifelodun','Ila','Ilesa East','Ilesa West','Irepodun',
        'Irewole','Isokan','Iwo','Obokun','Odo-Otin','Ola-Oluwa','Olorunda','Oriade',
        'Orolu','Osogbo',
    ];

    // ─── Verify identity ───────────────────────────────────────────────────────

    public function showVerify()
    {
        return inertia('Verification/Verify', [
            'lgas' => self::OSUN_LGAS,
        ]);
    }

    public function verify(Request $request)
    {
        $request->validate([
            'phone_number' => 'required|string|max:20',
            'lga'          => 'required|string|in:' . implode(',', self::OSUN_LGAS),
        ]);

        $phone = preg_replace('/\s+/', '', trim($request->phone_number));
        $lga   = trim($request->lga);

        // Check phone against both phone_number and whatsapp_number columns
        $application = ImportedContractApplication::where('lga', $lga)
            ->where(function ($q) use ($phone) {
                $q->whereRaw("REPLACE(phone_number, ' ', '') = ?", [$phone])
                  ->orWhereRaw("REPLACE(whatsapp_number, ' ', '') = ?", [$phone]);
            })
            ->first();

        if (!$application) {
            return back()->withErrors([
                'phone_number' => 'No record found for this phone number and LGA. Please check and try again.',
            ]);
        }

        // Generate cryptographically secure token
        $token     = bin2hex(random_bytes(32)); // 64 hex chars
        $ip        = $request->ip();
        $expiresAt = now()->addDays(2);

        ApplicationToken::create([
            'token'                      => $token,
            'imported_application_id'    => $application->id,
            'ip_address'                 => $ip,
            'expires_at'                 => $expiresAt,
        ]);

        // Cookie: httpOnly, 2-day expiry, SameSite=Strict
        $cookie = cookie('apply_token', $token, 60 * 24 * 2, '/', null, false, true, false, 'strict');

        return redirect()->route('apply.form', $token)->withCookie($cookie);
    }

    // ─── Application form ──────────────────────────────────────────────────────

    public function showApplicationForm(Request $request, string $token)
    {
        $record = $this->resolveToken($request, $token);

        if (!$record) {
            return inertia('Verification/Unauthorized', [
                'reason' => $this->unauthorizedReason($request, $token),
            ]);
        }

        $app = $record->importedApplication;

        return inertia('Verification/Apply', [
            'token'   => $token,
            'lgas'    => self::OSUN_LGAS,
            'prefill' => [
                'full_name'             => $app->full_name,
                'calling_phone_number'  => $app->phone_number,
                'whatsapp_number'       => $app->whatsapp_number,
                'lga'                   => $app->lga,
                'ward'                  => $app->ward ?? '',
                'unit'                  => $app->unit ?? '',
                'has_voter_card'        => (bool) $app->has_voter_card,
            ],
        ]);
    }

    public function submitApplication(Request $request, string $token)
    {
        $record = $this->resolveToken($request, $token);

        if (!$record) {
            abort(403, 'Unauthorized. Your session is invalid, expired, or this link was accessed from a different IP address.');
        }

        $validated = $request->validate([
            'full_name'                         => 'required|string|max:255',
            'gender'                            => 'required|in:Male,Female',
            'age'                               => 'required|integer|min:18|max:60',
            'email_address'                     => 'required|email|max:255',
            'calling_phone_number'              => 'required|string|max:20',
            'whatsapp_number'                   => 'required|string|max:20',
            'state_of_residence'                => 'required|string|max:255',
            'house_address'                     => 'required|string',
            'browsing_network'                  => 'required|string|max:255',
            'browsing_number'                   => 'required|string|max:20',
            'bank_name'                         => 'required|string|max:255',
            'bank_code'                         => 'required|string|max:20',
            'account_number'                    => 'required|string|max:20',
            'bank_account_name'                 => 'required|string|max:255',
            'employment_status'                 => 'required|string|max:255',
            'availability'                      => 'required|in:all_opportunities,southwest_travel,outside_state,not_available',
            'current_occupation'                => 'required_if:employment_status,Employed,Self-employed|nullable|string|max:255',
            'work_grade_level'                  => 'required_if:employment_status,Employed|nullable|string|max:255',
            'lga'                               => 'required|string|max:255',
            'ward'                              => 'nullable|string|max:255',
            'unit'                              => 'nullable|string|max:255',
            'has_voter_card'                    => 'nullable|boolean',
            'passport_photograph'               => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'valid_id_card'                     => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'highest_qualification_certificate' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $passportPath    = $this->uploadFile($request->file('passport_photograph'), $validated['full_name'], 'passport');
        $idCardPath      = $this->uploadFile($request->file('valid_id_card'), $validated['full_name'], 'id_card');
        $certificatePath = $this->uploadFile($request->file('highest_qualification_certificate'), $validated['full_name'], 'certificate');

        NgoContractApplication::create([
            'full_name'                               => $validated['full_name'],
            'gender'                                  => $validated['gender'],
            'age'                                     => $validated['age'],
            'email_address'                           => $validated['email_address'],
            'calling_phone_number'                    => $validated['calling_phone_number'],
            'whatsapp_number'                         => $validated['whatsapp_number'],
            'state_of_residence'                      => $validated['state_of_residence'],
            'house_address'                           => $validated['house_address'],
            'browsing_network'                        => $validated['browsing_network'],
            'browsing_number'                         => $validated['browsing_number'],
            'bank_name'                               => $validated['bank_name'],
            'bank_code'                               => $validated['bank_code'],
            'account_number'                          => $validated['account_number'],
            'bank_account_name'                       => $validated['bank_account_name'],
            'employment_status'                       => $validated['employment_status'],
            'availability'                            => $validated['availability'],
            'current_occupation'                      => $validated['current_occupation'] ?? null,
            'work_grade_level'                        => $validated['work_grade_level'] ?? null,
            'lga'                                     => $validated['lga'],
            'ward'                                    => $validated['ward'] ?? null,
            'unit'                                    => $validated['unit'] ?? null,
            'has_voter_card'                          => (bool) ($validated['has_voter_card'] ?? false),
            'passport_photograph_path'                => $passportPath,
            'valid_id_card_path'                      => $idCardPath,
            'highest_qualification_certificate_path'  => $certificatePath,
        ]);

        // Delete the token so it can't be reused
        $record->delete();

        // Expire the cookie
        $cookie = cookie('apply_token', '', -1);

        return redirect()->route('apply.success')->withCookie($cookie);
    }

    public function success()
    {
        return inertia('Verification/Success');
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private function resolveToken(Request $request, string $token): ?ApplicationToken
    {
        if (!preg_match('/^[0-9a-f]{64}$/', $token)) {
            return null;
        }

        $cookieToken = $request->cookie('apply_token');
        if (!hash_equals((string) $token, (string) $cookieToken)) {
            return null;
        }

        return ApplicationToken::with('importedApplication')
            ->where('token', $token)
            ->where('ip_address', $request->ip())
            ->where('expires_at', '>', now())
            ->first();
    }

    private function unauthorizedReason(Request $request, string $token): string
    {
        if (!preg_match('/^[0-9a-f]{64}$/', $token)) {
            return 'invalid_token';
        }

        $record = ApplicationToken::where('token', $token)->first();

        if (!$record) return 'invalid_token';
        if ($record->expires_at->isPast()) return 'expired';
        if ($record->ip_address !== $request->ip()) return 'wrong_ip';

        $cookieToken = $request->cookie('apply_token');
        if (!$cookieToken || !hash_equals($token, $cookieToken)) return 'missing_cookie';

        return 'invalid_token';
    }

    private function uploadFile($file, string $fullName, string $type): string
    {
        $sanitizedName = Str::slug($fullName);
        $randomNumber  = rand(1000, 9999);
        $fileName      = "{$sanitizedName}_{$randomNumber}_{$type}." . $file->getClientOriginalExtension();

        return $file->storeAs('ngo-applications', $fileName, 'public');
    }
}
