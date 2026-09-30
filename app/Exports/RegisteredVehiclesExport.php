<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * The vehicle register. Chunked off the query — this is the table expected to
 * grow into the tens of thousands, so it must never be fetched whole.
 */
class RegisteredVehiclesExport implements FromQuery, WithHeadings, WithMapping, WithStyles, ShouldAutoSize, WithChunkReading
{
    public function __construct(private $query) {}

    public function query()
    {
        return $this->query;
    }

    public function chunkSize(): int
    {
        return 500;
    }

    public function map($v): array
    {
        return [
            $v->id,
            $v->plate_number,
            $v->category_label,
            $v->vehicle_type,
            $v->make_model,
            $v->colour,
            $v->capacity,
            $v->owner_name,
            $v->owner_phone,
            $v->owner_address,
            $v->lga_name,
            $v->agent->full_name ?? '—',
            $v->agent->phone_number ?? '—',
            $v->vehicle_photo_path ? 'Yes' : 'No',
            $v->owner_photo_path ? 'Yes' : 'No',
            optional($v->created_at)->format('Y-m-d H:i') ?? '',
        ];
    }

    public function headings(): array
    {
        return [
            'ID', 'Plate Number', 'Category', 'Vehicle Type',
            'Make/Model', 'Colour', 'Capacity',
            'Owner Name', 'Owner Phone', 'Owner Address',
            'LGA', 'Captured By', 'Agent Phone',
            'Vehicle Photo', 'Owner Photo',
            'Captured At',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [1 => ['font' => ['bold' => true]]];
    }
}
