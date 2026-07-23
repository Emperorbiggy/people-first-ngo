<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class NewFormDataExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    public function __construct(private $entries) {}

    public function collection()
    {
        return $this->entries->map(fn ($entry) => [
            $entry->id,
            $entry->full_name,
            $entry->phone_number,
            $entry->lga?->name ?? '',
            $entry->ward?->name ?? '',
            $entry->created_at->format('Y-m-d H:i'),
        ]);
    }

    public function headings(): array
    {
        return [
            'ID',
            'Name',
            'Phone Number',
            'LGA',
            'Ward',
            'Registered At',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
