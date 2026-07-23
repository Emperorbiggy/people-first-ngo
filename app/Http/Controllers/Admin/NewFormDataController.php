<?php

namespace App\Http\Controllers\Admin;

use App\Exports\NewFormDataExport;
use App\Http\Controllers\Controller;
use App\Models\NewFormData;
use Maatwebsite\Excel\Facades\Excel;
use ZipArchive;

class NewFormDataController extends Controller
{
    public function index()
    {
        $entries = NewFormData::with(['lga:id,name', 'ward:id,name'])
            ->latest()
            ->get(['id', 'full_name', 'phone_number', 'lga_id', 'ward_id', 'passport_photograph_path', 'created_at']);

        return inertia('Admin/NewFormData', compact('entries'));
    }

    public function exportExcel()
    {
        $entries = NewFormData::with(['lga:id,name', 'ward:id,name'])->latest()->get();

        return Excel::download(new NewFormDataExport($entries), 'form_registrations.xlsx');
    }

    public function exportZip()
    {
        $entries = NewFormData::whereNotNull('passport_photograph_path')->latest()->get();

        $tempDir = storage_path('app/temp');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $zipName = 'form_registration_passports.zip';
        $zipPath = "{$tempDir}/{$zipName}";

        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($entries as $entry) {
            $filePath = storage_path('app/public/' . $entry->passport_photograph_path);
            if ($filePath && file_exists($filePath)) {
                $zip->addFile($filePath, basename($filePath));
            }
        }

        $zip->close();

        return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
    }
}
