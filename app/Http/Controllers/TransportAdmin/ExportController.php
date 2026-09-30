<?php

namespace App\Http\Controllers\TransportAdmin;

use App\Exports\RegisteredVehiclesExport;
use App\Exports\TransportAgentsExport;
use App\Http\Controllers\Controller;
use App\Models\RegisteredVehicle;
use App\Models\TransportAgent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use ZipArchive;

/**
 * Downloads for the transport panel.
 *
 * Spreadsheets stream off the query, so "all records" is one file however large
 * the register gets. Photo ZIPs cannot stream the same way — the archive is
 * built on disk first — so those stay in batches.
 */
class ExportController extends Controller
{
    /** Photos per ZIP. Thousands of images in one archive exhausts the request. */
    private const ZIP_BATCH = 300;

    public function agents(Request $request)
    {
        $query = TransportAgent::query()
            ->withCount('vehicles')
            ->when($request->get('lga', 'all') !== 'all', fn ($q) => $q->where('lga_id', $request->get('lga')))
            ->when($request->get('category', 'all') !== 'all', fn ($q) => $q->where('category', $request->get('category')))
            ->orderByDesc('id');

        return Excel::download(new TransportAgentsExport($query), 'transport_agents.xlsx');
    }

    public function vehicles(Request $request)
    {
        $query = $this->vehicleQuery($request)->with('agent:id,full_name,phone_number');

        return Excel::download(new RegisteredVehiclesExport($query), 'registered_vehicles.xlsx');
    }

    /**
     * Vehicle or owner photos as a ZIP, one batch at a time.
     *
     * Named by plate number so a file can be matched back to its row in the
     * spreadsheet without opening it.
     */
    public function photos(Request $request)
    {
        $which = $request->get('file') === 'owner' ? 'owner' : 'vehicle';
        $batch = max(1, (int) $request->get('batch', 1));
        $column = "{$which}_photo_path";

        $vehicles = $this->vehicleQuery($request)
            ->whereNotNull($column)
            ->skip(($batch - 1) * self::ZIP_BATCH)
            ->take(self::ZIP_BATCH)
            ->get(['id', 'plate_number', $column]);

        if ($vehicles->isEmpty()) {
            return back()->with('error', 'No photos in that batch.');
        }

        $tempDir = storage_path('app/temp');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $zipName = "{$which}_photos_batch{$batch}.zip";
        $zipPath = "{$tempDir}/{$zipName}";

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return back()->with('error', 'Could not create the archive.');
        }

        $added = 0;
        foreach ($vehicles as $vehicle) {
            $path = $vehicle->{$column};

            if (!$path || !Storage::disk('public')->exists($path)) {
                continue;
            }

            $extension = pathinfo($path, PATHINFO_EXTENSION) ?: 'jpg';
            $zip->addFile(
                Storage::disk('public')->path($path),
                "{$vehicle->plate_number}-{$which}.{$extension}"
            );
            $added++;
        }

        $zip->close();

        if ($added === 0) {
            @unlink($zipPath);

            return back()->with('error', 'None of the photos in that batch are still on disk.');
        }

        return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
    }

    /** The same filters the register screen uses, so a download matches it. */
    private function vehicleQuery(Request $request)
    {
        return RegisteredVehicle::query()
            ->when($request->get('category', 'all') !== 'all', fn ($q) => $q->where('category', $request->get('category')))
            ->when($request->get('lga', 'all') !== 'all', fn ($q) => $q->where('lga_id', $request->get('lga')))
            ->when($request->get('agent', 'all') !== 'all', fn ($q) => $q->where('transport_agent_id', $request->get('agent')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('created_at', '>=', $request->get('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('created_at', '<=', $request->get('to')))
            // Unique-column order, so batch boundaries cannot drift between
            // queries and drop a photo from every batch.
            ->orderByDesc('id');
    }
}
