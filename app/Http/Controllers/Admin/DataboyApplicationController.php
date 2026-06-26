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
    public function index(Request $request)
    {
        $state = $request->get('state', 'all');

        $query = DataboyApplication::with(['databoy:id,full_name', 'lga:id,name', 'ward:id,name', 'pollingUnit:id,name'])->latest();
        if ($state !== 'all') {
            $query->where('state_of_residence', $state);
        }

        $applications = $query->get();
        $totalCount   = DataboyApplication::count();
        $states       = DataboyApplication::distinct()->orderBy('state_of_residence')->pluck('state_of_residence');

        $statsByState = DataboyApplication::selectRaw('state_of_residence, count(*) as total')
            ->groupBy('state_of_residence')
            ->orderByDesc('total')
            ->get();

        return inertia('Admin/DataboyApplications/Index', [
            'applications'  => $applications,
            'states'        => $states,
            'selectedState' => $state,
            'totalCount'    => $totalCount,
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

        $query = DataboyApplication::with(['databoy:id,full_name', 'lga:id,name', 'ward:id,name', 'pollingUnit:id,name'])->latest();
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
