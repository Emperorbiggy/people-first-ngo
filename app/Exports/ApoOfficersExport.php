<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ApoOfficersExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    public function __construct(private $officers) {}

    public function collection()
    {
        return $this->officers->map(fn ($officer) => [
            $officer['full_name'],
            $officer['is_replaced'] ? 'Yes' : 'No',
            $officer['previous_full_name'] ?? '',
            $officer['phone_number'],
            $officer['email'],
            $officer['lga'],
            $officer['ward'],
            $officer['registered_by'],
            optional($officer['qualified_at'])->format('Y-m-d H:i'),
            optional($officer['replaced_at'])->format('Y-m-d H:i'),
        ]);
    }

    public function headings(): array
    {
        return [
            'Name',
            'Replaced?',
            'Previous Name',
            'Phone Number',
            'Email',
            'LGA',
            'Ward',
            'Registered By (Databoy)',
            'Qualified At',
            'Replaced At',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
