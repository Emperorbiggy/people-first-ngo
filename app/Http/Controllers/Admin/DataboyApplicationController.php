<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataboyApplication;
use App\Exports\DataboyApplicationsExport;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use ZipArchive;

class DataboyApplicationController extends Controller
{
    /** Rows per page. Exports still work in batches of 500, independently. */
    private const PER_PAGE = 50;

    public function index(Request $request)
    {
        $state  = $request->get('state', 'all');
        $search = trim((string) $request->get('q', ''));

        // Only the columns the table renders. The row carries addresses and
        // three document paths that this screen never shows, and sending them
        // for every applicant was most of the payload.
        $applications = DataboyApplication::query()
            ->select([
                'id', 'registered_by', 'full_name',
                'email_address', 'calling_phone_number',
                'state_of_residence', 'lga_id', 'ward_id', 'polling_unit_id',
                'browsing_network', 'browsing_number',
                'bank_name', 'account_number',
                'employment_status', 'passport_photograph_path', 'created_at',
            ])
            ->with([
                'databoy:id,full_name',
                'lga:id,name',
                'ward:id,name',
                'pollingUnit:id,name',
                'apoOfficer:id,databoy_application_id,replaced_at',
            ])
            ->when($state !== 'all', fn ($q) => $q->where('state_of_residence', $state))
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('full_name', 'like', "%{$search}%")
                ->orWhere('calling_phone_number', 'like', "%{$search}%")
                ->orWhere('account_number', 'like', "%{$search}%")
                ->orWhere('email_address', 'like', "%{$search}%")))
            ->latest()
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        // One grouped query answers both the per-state breakdown and the
        // overall total, instead of a second count query over the table.
        $statsByState = DataboyApplication::selectRaw('state_of_residence, count(*) as total')
            ->groupBy('state_of_residence')
            ->orderByDesc('total')
            ->get();

        return inertia('Admin/DataboyApplications/Index', [
            'applications'  => $applications,
            'states'        => $statsByState->pluck('state_of_residence')->sort()->values(),
            'selectedState' => $state,
            'search'        => $search,
            'totalCount'    => (int) $statsByState->sum('total'),
            'statsByState'  => $statsByState,
        ]);
    }

    public function show(DataboyApplication $databoyApplication)
    {
        $databoyApplication->load(['databoy:id,full_name,login_email,calling_phone_number', 'lga:id,name', 'ward:id,name', 'pollingUnit:id,name']);

        return inertia('Admin/DataboyApplications/Show', [
            'application' => $databoyApplication,
        ]);
    }

    public function exportExcel(Request $request)
    {
        $state = $request->get('state', 'all');
        $batch = max(1, (int) $request->get('batch', 1));

        $query = DataboyApplication::with(['databoy:id,full_name', 'lga:id,name', 'ward:id,name', 'pollingUnit:id,name', 'apoOfficer:id,databoy_application_id,replaced_at'])->latest();
        if ($state !== 'all') {
            $query->where('state_of_residence', $state);
        }

        $applications = $query->skip(($batch - 1) * 500)->take(500)->get();
        $suffix       = $state !== 'all' ? "_{$state}" : '';
        $filename     = "databoy_applications_batch{$batch}{$suffix}.xlsx";

        return Excel::download(new DataboyApplicationsExport($applications), $filename);
    }

    public function exportZip(Request $request)
    {
        $state    = $request->get('state', 'all');
        $batch    = max(1, (int) $request->get('batch', 1));
        $fileType = $request->get('file', 'passport');

        $columnMap = [
            'passport'    => ['col' => 'passport_photograph_path',               'label' => 'db_passports'],
            'id_card'     => ['col' => 'valid_id_card_path',                     'label' => 'db_id_cards'],
            'certificate' => ['col' => 'highest_qualification_certificate_path', 'label' => 'db_certificates'],
        ];

        $map = $columnMap[$fileType] ?? $columnMap['passport'];

        $query = DataboyApplication::latest();
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
}
