<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EFormsExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    public function __construct(private $submissions) {}

    public function collection()
    {
        return $this->submissions->map(fn ($form) => [
            $form->application_id,
            $form->full_name,
            // Leading zeros survive Excel only as text.
            (string) $form->phone_number,
            $form->lga_of_training,
            $form->gender,
            $form->bank_name,
            (string) $form->account_number,
            optional($form->created_at)->format('Y-m-d H:i'),
        ]);
    }

    public function headings(): array
    {
        return [
            'Application ID',
            'Full Name',
            'Phone Number',
            'LGA of Training',
            'Gender',
            'Bank Name',
            'Account Number',
            'Submitted',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Phone and account columns as text so 08012345678 keeps its zero.
        $sheet->getStyle('C')->getNumberFormat()->setFormatCode('@');
        $sheet->getStyle('G')->getNumberFormat()->setFormatCode('@');

        return [1 => ['font' => ['bold' => true]]];
    }
}
