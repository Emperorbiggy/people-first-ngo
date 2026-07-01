<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\NgoContractApplication;
use App\Models\Databoy;
use App\Models\Lga;
use App\Exports\ApplicationsExport;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use App\Services\PaystackService;
use Maatwebsite\Excel\Facades\Excel;
use ZipArchive;

class NgoContractApplicationController extends Controller
{
    public function dashboard(Request $request)
    {
        $state = $request->get('state', 'all');

        $query = NgoContractApplication::latest();
        if ($state !== 'all') {
            $query->where('state_of_residence', $state);
        }

        $applications = $query->get();
        $states       = NgoContractApplication::distinct()
            ->orderBy('state_of_residence')
            ->pluck('state_of_residence');

        $totalCount   = NgoContractApplication::count();
        $batchCount   = (int) ceil($applications->count() / 500) ?: 1;

        $statsByState = NgoContractApplication::selectRaw('state_of_residence, count(*) as total')
            ->groupBy('state_of_residence')
            ->orderByDesc('total')
            ->get();

        // Databoy stats
        $registeredWardIds = Databoy::whereNotNull('ward_id')->pluck('ward_id');

        $databoyStats = [
            'total' => Databoy::count(),
            'lgas'  => Databoy::whereNotNull('lga_id')->distinct('lga_id')->count('lga_id'),
            'wards' => $registeredWardIds->count(),
        ];

        $lgaCoverage = Lga::withCount([
            'wards',
            'wards as registered_count' => fn ($q) => $q->whereIn('id', $registeredWardIds),
        ])->orderBy('name')->get(['id', 'name']);

        $databoys = Databoy::with(['lga:id,name', 'ward:id,name'])
            ->latest()
            ->get(['id', 'full_name', 'login_email', 'calling_phone_number', 'lga_id', 'ward_id', 'created_at']);

        return inertia('Dashboard', [
            'applications'  => $applications,
            'states'        => $states,
            'selectedState' => $state,
            'totalCount'    => $totalCount,
            'batchCount'    => $batchCount,
            'statsByState'  => $statsByState,
            'databoyStats'  => $databoyStats,
            'lgaCoverage'   => $lgaCoverage,
            'databoys'      => $databoys,
        ]);
    }

    public function index()
    {
        return redirect()->route('dashboard');
    }

    public function create()
    {
        return inertia('NgoContractApplications/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name'                          => 'required|string|max:255',
            'gender'                             => 'required|in:Male,Female',
            'age'                                => 'required|integer|min:18|max:60',
            'email_address'                      => 'required|email|max:255',
            'calling_phone_number'               => 'required|string|max:20',
            'whatsapp_number'                    => 'required|string|max:20',
            'state_of_residence'                 => 'required|string|max:255',
            'house_address'                      => 'required|string',
            'browsing_network'                   => 'required|string|max:255',
            'browsing_number'                    => 'required|string|max:20',
            'bank_name'                          => 'required|string|max:255',
            'bank_code'                          => 'required|string|max:20',
            'account_number'                     => 'required|string|max:20',
            'bank_account_name'                  => 'required|string|max:255',
            'employment_status'                  => 'required|string|max:255',
            'availability'                       => 'required|string|in:all_opportunities,southwest_travel,outside_state,not_available',
            'current_occupation'                 => 'required_if:employment_status,Employed,Self-employed|nullable|string|max:255',
            'work_grade_level'                   => 'required_if:employment_status,Employed|nullable|string|max:255',
            'passport_photograph'                => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'valid_id_card'                      => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'highest_qualification_certificate'  => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $passportPath    = $this->uploadFile($request->file('passport_photograph'), $validated['full_name'], 'passport');
        $idCardPath      = $this->uploadFile($request->file('valid_id_card'), $validated['full_name'], 'id_card');
        $certificatePath = $this->uploadFile($request->file('highest_qualification_certificate'), $validated['full_name'], 'certificate');

        NgoContractApplication::create([
            'full_name'                                => $validated['full_name'],
            'gender'                                   => $validated['gender'],
            'age'                                      => $validated['age'],
            'email_address'                            => $validated['email_address'],
            'calling_phone_number'                     => $validated['calling_phone_number'],
            'whatsapp_number'                          => $validated['whatsapp_number'],
            'state_of_residence'                       => $validated['state_of_residence'],
            'house_address'                            => $validated['house_address'],
            'browsing_network'                         => $validated['browsing_network'],
            'browsing_number'                          => $validated['browsing_number'],
            'bank_name'                                => $validated['bank_name'],
            'bank_code'                                => $validated['bank_code'],
            'account_number'                           => $validated['account_number'],
            'bank_account_name'                        => $validated['bank_account_name'],
            'employment_status'                        => $validated['employment_status'],
            'availability'                             => $validated['availability'],
            'current_occupation'                       => $validated['current_occupation'] ?? null,
            'work_grade_level'                         => $validated['work_grade_level'] ?? null,
            'passport_photograph_path'                 => $passportPath,
            'valid_id_card_path'                       => $idCardPath,
            'highest_qualification_certificate_path'   => $certificatePath,
        ]);

        return redirect()->route('ngo-contract-applications.success');
    }

    public function success()
    {
        return inertia('NgoContractApplications/Success');
    }

    public function exportExcel(Request $request)
    {
        $state = $request->get('state', 'all');
        $batch = max(1, (int) $request->get('batch', 1));

        $query = NgoContractApplication::latest();
        if ($state !== 'all') {
            $query->where('state_of_residence', $state);
        }

        $applications = $query->skip(($batch - 1) * 500)->take(500)->get();
        $suffix       = $state !== 'all' ? "_{$state}" : '';
        $filename     = "applications_batch{$batch}{$suffix}.xlsx";

        return Excel::download(new ApplicationsExport($applications), $filename);
    }

    public function exportZip(Request $request)
    {
        $state    = $request->get('state', 'all');
        $batch    = max(1, (int) $request->get('batch', 1));
        $fileType = $request->get('file', 'passport'); // passport | id_card | certificate

        $columnMap = [
            'passport'    => ['col' => 'passport_photograph_path',               'label' => 'passports'],
            'id_card'     => ['col' => 'valid_id_card_path',                     'label' => 'id_cards'],
            'certificate' => ['col' => 'highest_qualification_certificate_path', 'label' => 'certificates'],
        ];

        $map = $columnMap[$fileType] ?? $columnMap['passport'];

        $query = NgoContractApplication::latest();
        if ($state !== 'all') {
            $query->where('state_of_residence', $state);
        }

        $applications = $query->skip(($batch - 1) * 500)->take(500)->get();

        $tempDir = storage_path('app/temp');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $suffix  = $state !== 'all' ? "_{$state}" : '';
        $zipName = "{$map['label']}_batch{$batch}{$suffix}.zip";
        $zipPath = "{$tempDir}/{$zipName}";

        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($applications as $app) {
            $filePath = storage_path('app/public/' . $app->{$map['col']});
            if ($filePath && file_exists($filePath)) {
                $zip->addFile($filePath, basename($filePath));
            }
        }

        $zip->close();

        return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
    }

    private function uploadFile($file, $fullName, $type)
    {
        $sanitizedName = strtolower(preg_replace('/\s+/', ' ', trim($fullName)));
        $randomNumber  = rand(1000, 9999);
        $fileName      = "{$sanitizedName} {$randomNumber} {$type}." . $file->getClientOriginalExtension();

        return $file->storeAs('ngo-applications', $fileName, 'public');
    }

    public function show(NgoContractApplication $ngoContractApplication)
    {
        return inertia('NgoContractApplications/Show', [
            'application' => $ngoContractApplication
        ]);
    }

    // ─── API Methods ────────────────────────────────────────────────────────────

    public function apiIndex()
    {
        $applications = NgoContractApplication::latest()->get();
        return response()->json(['status' => 'success', 'data' => $applications]);
    }

    public function apiShow($id)
    {
        $application = NgoContractApplication::find($id);

        if (!$application) {
            return response()->json(['status' => 'error', 'message' => 'Application not found'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $application]);
    }

    public function apiStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'full_name'                          => 'required|string|max:255',
            'email_address'                      => 'required|email|max:255',
            'calling_phone_number'               => 'required|string|max:20',
            'whatsapp_number'                    => 'required|string|max:20',
            'state_of_residence'                 => 'required|string|max:255',
            'house_address'                      => 'required|string',
            'browsing_network'                   => 'required|string|max:255',
            'browsing_number'                    => 'required|string|max:20',
            'bank_name'                          => 'required|string|max:255',
            'account_number'                     => 'required|string|max:20',
            'bank_account_name'                  => 'required|string|max:255',
            'employment_status'                  => 'required|string|max:255',
            'current_occupation'                 => 'required_if:employment_status,Employed,Self-employed|nullable|string|max:255',
            'work_grade_level'                   => 'required_if:employment_status,Employed|nullable|string|max:255',
            'passport_photograph'                => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'valid_id_card'                      => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'highest_qualification_certificate'  => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        try {
            $passportPath    = $this->uploadFile($request->file('passport_photograph'), $request->full_name, 'passport');
            $idCardPath      = $this->uploadFile($request->file('valid_id_card'), $request->full_name, 'id_card');
            $certificatePath = $this->uploadFile($request->file('highest_qualification_certificate'), $request->full_name, 'certificate');

            $application = NgoContractApplication::create([
                'full_name'                               => $request->full_name,
                'email_address'                           => $request->email_address,
                'calling_phone_number'                    => $request->calling_phone_number,
                'whatsapp_number'                         => $request->whatsapp_number,
                'state_of_residence'                      => $request->state_of_residence,
                'house_address'                           => $request->house_address,
                'browsing_network'                        => $request->browsing_network,
                'browsing_number'                         => $request->browsing_number,
                'bank_name'                               => $request->bank_name,
                'account_number'                          => $request->account_number,
                'bank_account_name'                       => $request->bank_account_name,
                'employment_status'                       => $request->employment_status,
                'current_occupation'                      => $request->current_occupation,
                'work_grade_level'                        => $request->work_grade_level,
                'passport_photograph_path'                => $passportPath,
                'valid_id_card_path'                      => $idCardPath,
                'highest_qualification_certificate_path'  => $certificatePath,
            ]);

            return response()->json(['status' => 'success', 'message' => 'Application submitted successfully!', 'data' => $application], 201);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to submit application: ' . $e->getMessage()], 500);
        }
    }

    public function getBanks()
    {
        try {
            $paystackService = new PaystackService();
            $banks = $paystackService->fetchBanks();
            return response()->json(['status' => 'success', 'data' => $banks]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to fetch banks'], 500);
        }
    }

    public function resolveAccount(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'account_number' => 'required|string|digits:10',
            'bank_code'      => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        try {
            $paystackService = new PaystackService();
            $result = $paystackService->resolveAccountNumber($request->account_number, $request->bank_code);
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to resolve account'], 500);
        }
    }
}
