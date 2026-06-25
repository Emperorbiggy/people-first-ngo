<?php

namespace App\Http\Controllers;

use App\Models\Country;
use App\Models\Lga;
use App\Models\PollingUnit;
use App\Models\State;
use App\Models\Ward;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class GeoImportController extends Controller
{
    public function countries()
    {
        return response()->json(Country::orderBy('name')->get(['id', 'name']));
    }

    public function states(Country $country)
    {
        return response()->json($country->states()->orderBy('name')->get(['id', 'name']));
    }

    public function showPage()
    {
        return inertia('GeoImport');
    }

    public function preview(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'state_id' => 'required|exists:states,id',
            'file'     => 'required|file|extensions:csv,txt,xlsx,xls|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $state   = State::findOrFail($request->state_id);
        $allRows = $this->parseFile($request->file('file'));

        if (empty($allRows)) {
            return response()->json(['errors' => ['file' => ['No valid data rows found in the file.']]], 422);
        }

        $fileStates = collect($allRows)->pluck('state_name')->filter()->unique()->values();
        $rows       = $this->filterByState($allRows, $state->name);

        if (empty($rows)) {
            return response()->json([
                'errors' => ['file' => [
                    "No rows found for \"{$state->name}\" in the file. "
                    . "States found: " . $fileStates->implode(', ') . '.',
                ]],
            ], 422);
        }

        $lgas      = collect($rows)->pluck('lga_name')->filter()->unique()->values();
        $wardCount = collect($rows)->map(fn ($r) => $r['lga_name'] . '|' . $r['ward_name'])->filter()->unique()->count();
        $puCount   = collect($rows)->filter(fn ($r) => !empty($r['polling_unit_name']))->count();

        return response()->json([
            'rows'        => count($rows),
            'lga_count'   => $lgas->count(),
            'ward_count'  => $wardCount,
            'pu_count'    => $puCount,
            'lgas'        => $lgas->take(5)->values(),
            'file_states' => $fileStates,
        ]);
    }

    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'state_id' => 'required|exists:states,id',
            'file'     => 'required|file|extensions:csv,txt,xlsx,xls|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $state   = State::findOrFail($request->state_id);
        $allRows = $this->parseFile($request->file('file'));

        if (empty($allRows)) {
            return response()->json(['errors' => ['file' => ['No valid data rows found.']]], 422);
        }

        $rows = $this->filterByState($allRows, $state->name);

        if (empty($rows)) {
            $fileStates = collect($allRows)->pluck('state_name')->filter()->unique()->implode(', ');
            return response()->json([
                'errors' => ['file' => ["No rows match \"{$state->name}\". States in file: {$fileStates}."]],
            ], 422);
        }

        $stats     = ['lgas' => 0, 'wards' => 0, 'polling_units' => 0];
        $lgaCache  = [];
        $wardCache = [];

        DB::transaction(function () use ($rows, $state, &$stats, &$lgaCache, &$wardCache) {
            foreach ($rows as $row) {
                $lgaName  = trim($row['lga_name'] ?? '');
                $wardName = trim($row['ward_name'] ?? '');
                $puName   = trim($row['polling_unit_name'] ?? '');

                if ($lgaName === '' || $wardName === '' || $puName === '') {
                    continue;
                }

                $lgaKey = strtolower($lgaName);
                if (!isset($lgaCache[$lgaKey])) {
                    [$lga, $created] = $this->firstOrCreateTracked(
                        Lga::class,
                        ['state_id' => $state->id, 'name' => $lgaName],
                        ['head_quarter' => '']
                    );
                    if ($created) $stats['lgas']++;
                    $lgaCache[$lgaKey] = $lga->id;
                }
                $lgaId = $lgaCache[$lgaKey];

                $wardKey = $lgaKey . '|' . strtolower($wardName);
                if (!isset($wardCache[$wardKey])) {
                    [$ward, $created] = $this->firstOrCreateTracked(
                        Ward::class,
                        ['lga_id' => $lgaId, 'name' => $wardName],
                        ['state_id' => $state->id, 'country_id' => $state->country_id]
                    );
                    if ($created) $stats['wards']++;
                    $wardCache[$wardKey] = $ward->id;
                }
                $wardId = $wardCache[$wardKey];

                [, $created] = $this->firstOrCreateTracked(
                    PollingUnit::class,
                    ['ward_id' => $wardId, 'name' => $puName],
                    []
                );
                if ($created) $stats['polling_units']++;
            }
        });

        return response()->json([
            'message' => "Import complete for {$state->name}.",
            'stats'   => $stats,
        ]);
    }

    private function filterByState(array $rows, string $stateName): array
    {
        $hasStateCol = collect($rows)->contains(fn ($r) => !empty($r['state_name']));
        if (!$hasStateCol) {
            return $rows;
        }

        $target = strtoupper(trim($stateName));

        return array_values(array_filter($rows, function ($row) use ($target) {
            return strtoupper(trim($row['state_name'] ?? '')) === $target;
        }));
    }

    private function firstOrCreateTracked(string $model, array $search, array $extra): array
    {
        $existing = $model::where($search)->first();
        if ($existing) {
            return [$existing, false];
        }
        return [$model::create(array_merge($search, $extra)), true];
    }

    private function parseFile(\Illuminate\Http\UploadedFile $file): array
    {
        $ext = strtolower($file->getClientOriginalExtension());

        return in_array($ext, ['xlsx', 'xls'])
            ? $this->parseExcel($file)
            : $this->parseCsv($file);
    }

    private function parseCsv(\Illuminate\Http\UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        $header = null;
        $rows   = [];

        while (($line = fgetcsv($handle)) !== false) {
            if ($header === null) {
                $header = array_map(fn ($h) => strtoupper(trim($h)), $line);
                continue;
            }
            $row    = array_combine($header, array_pad($line, count($header), ''));
            $mapped = $this->mapRow($row);
            if ($mapped) $rows[] = $mapped;
        }

        fclose($handle);
        return $rows;
    }

    private function parseExcel(\Illuminate\Http\UploadedFile $file): array
    {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getRealPath());
        $sheet  = $spreadsheet->getActiveSheet();
        $data   = $sheet->toArray();
        $header = null;
        $rows   = [];

        foreach ($data as $line) {
            if ($header === null) {
                $header = array_map(fn ($h) => strtoupper(trim((string) $h)), $line);
                continue;
            }
            $row    = array_combine($header, array_pad($line, count($header), ''));
            $mapped = $this->mapRow($row);
            if ($mapped) $rows[] = $mapped;
        }

        return $rows;
    }

    private function mapRow(array $row): ?array
    {
        $norm = [];
        foreach ($row as $k => $v) {
            $norm[preg_replace('/\s+/', ' ', strtoupper(trim($k)))] = trim((string) $v);
        }

        $state = $norm['STATE NAME'] ?? $norm['STATENAME'] ?? $norm['STATE'] ?? '';
        $lga   = $norm['LGA NAME']   ?? $norm['LGANAME']   ?? $norm['LGA']   ?? '';
        $ward  = $norm['WARD NAME']  ?? $norm['WARDNAME']  ?? $norm['WARD']  ?? '';
        $pu    = $norm['POLLING STATION LOCATION/NAME']
              ?? $norm['POLLING STATION NAME']
              ?? $norm['POLLING UNIT NAME']
              ?? $norm['POLLING UNIT']
              ?? $norm['POLLINGUNIT']
              ?? '';

        if ($state === '' && $lga === '' && $ward === '' && $pu === '') {
            return null;
        }

        return [
            'state_name'        => $state,
            'lga_name'          => $lga,
            'ward_name'         => $ward,
            'polling_unit_name' => $pu,
        ];
    }
}
