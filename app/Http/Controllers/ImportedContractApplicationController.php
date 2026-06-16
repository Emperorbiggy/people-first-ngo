<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ImportedContractApplication;
use App\Models\NgoContractApplication;
use App\Exports\ImportedApplicationsExport;
use Maatwebsite\Excel\Facades\Excel;

class ImportedContractApplicationController extends Controller
{
    public function index()
    {
        $applications = ImportedContractApplication::latest()->get();

        return inertia('ImportedApplications/Index', [
            'applications' => $applications,
        ]);
    }

    public function exportExcel(Request $request)
    {
        $lga = $request->get('lga', 'all');

        $query = ImportedContractApplication::latest();
        if ($lga !== 'all') {
            $query->where('lga', $lga);
        }

        $applications = $query->get();

        // Match each imported record against a submitted NgoContractApplication
        // (by normalised phone/whatsapp number) so the export carries the full
        // submitted details (bank, employment, address, etc.) where available.
        $submitted = NgoContractApplication::all();
        $byPhone   = [];
        foreach ($submitted as $sub) {
            foreach ([$sub->calling_phone_number, $sub->whatsapp_number] as $num) {
                $norm = preg_replace('/\s+/', '', (string) $num);
                if ($norm !== '') {
                    $byPhone[$norm] = $sub;
                }
            }
        }

        $merged = $applications->map(function ($app) use ($byPhone) {
            $normPhone    = preg_replace('/\s+/', '', (string) $app->phone_number);
            $normWhatsapp = preg_replace('/\s+/', '', (string) $app->whatsapp_number);
            $match        = $byPhone[$normPhone] ?? $byPhone[$normWhatsapp] ?? null;

            return (object) [
                'imported' => $app,
                'submitted' => $match,
            ];
        });

        $suffix   = $lga !== 'all' ? "_{$lga}" : '';
        $filename = "imported_applications{$suffix}.xlsx";

        return Excel::download(new ImportedApplicationsExport($merged), $filename);
    }

    public function showImport()
    {
        return inertia('ImportedApplications/Import');
    }

    public function import(Request $request)
    {
        $request->validate([
            'csv_file' => 'required|file|mimes:csv,txt|max:10240',
            'lga'      => 'required|string|max:255',
        ]);

        $lga    = trim($request->input('lga'));
        $file   = $request->file('csv_file');
        $handle = fopen($file->getRealPath(), 'r');

        // Read header row and normalise to uppercase with no extra whitespace
        $rawHeaders = fgetcsv($handle);
        if (!$rawHeaders) {
            fclose($handle);
            return back()->withErrors(['csv_file' => 'The CSV file is empty or has no header row.']);
        }

        $headers = array_map(fn($h) => strtoupper(trim($h)), $rawHeaders);

        // Map normalised header -> DB column (ward & unit are filled by the applicant themselves on the apply form)
        $columnMap = [
            'FULL NAME'             => 'full_name',
            'PHONE NUMBER'          => 'phone_number',
            'WHATSAPP NUMBER'       => 'whatsapp_number',
            'HIGHEST QUALIFICATION' => 'highest_qualification',
        ];

        // Find column indexes
        $indexes = [];
        foreach ($columnMap as $header => $field) {
            $pos = array_search($header, $headers);
            if ($pos !== false) {
                $indexes[$field] = $pos;
            }
        }

        if (empty($indexes)) {
            fclose($handle);
            return back()->withErrors([
                'csv_file' => 'No recognised columns found. Expected: FULL NAME, PHONE NUMBER, WHATSAPP NUMBER, HIGHEST QUALIFICATION.',
            ]);
        }

        $imported = 0;
        $skipped  = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $data = ['lga' => $lga];

            foreach ($indexes as $field => $colIndex) {
                $data[$field] = isset($row[$colIndex]) ? trim($row[$colIndex]) : null;
            }

            // Skip completely blank rows
            $csvValues = array_diff_key($data, ['lga' => true]);
            if (empty(array_filter($csvValues))) {
                $skipped++;
                continue;
            }

            ImportedContractApplication::create($data);
            $imported++;
        }

        fclose($handle);

        return redirect()->route('imported-applications.index')
            ->with('success', "Import complete: {$imported} records imported to {$lga}, {$skipped} blank rows skipped.");
    }
}
