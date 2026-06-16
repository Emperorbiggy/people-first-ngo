<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ImportedApplicationsExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    public function __construct(private $rows) {}

    public function collection()
    {
        return $this->rows->map(function ($row) {
            $app = $row->imported;
            $sub = $row->submitted;

            return [
                $app->id,
                $app->full_name,
                $app->phone_number,
                $app->whatsapp_number,
                $app->highest_qualification ?? '',
                $app->lga ?? '',
                $sub ? 'Yes' : 'No',
                $sub->gender ?? '',
                $sub->age ?? '',
                $sub->email_address ?? '',
                $sub->state_of_residence ?? '',
                $sub->house_address ?? '',
                $sub->browsing_network ?? '',
                $sub->browsing_number ?? '',
                $sub->bank_name ?? '',
                $sub->bank_code ?? '',
                $sub->account_number ?? '',
                $sub->bank_account_name ?? '',
                $sub->employment_status ?? '',
                $sub->availability ?? '',
                $sub->current_occupation ?? '',
                $sub->work_grade_level ?? '',
                $sub->lga ?? $app->lga ?? '',
                $sub->ward ?? '',
                $sub->unit ?? '',
                $sub ? ($sub->has_voter_card ? 'Yes' : 'No') : '',
                $sub->created_at ? $sub->created_at->format('Y-m-d H:i') : '',
                $app->created_at->format('Y-m-d H:i'),
            ];
        });
    }

    public function headings(): array
    {
        return [
            'ID',
            'Full Name',
            'Phone Number',
            'WhatsApp Number',
            'Highest Qualification',
            'Import LGA',
            'Submitted Application',
            'Gender',
            'Age',
            'Email Address',
            'State of Residence',
            'House Address',
            'Browsing Network',
            'Browsing Number',
            'Bank Name',
            'Bank Code',
            'Account Number',
            'Account Name',
            'Employment Status',
            'Availability',
            'Current Occupation',
            'Work Grade Level',
            'LGA',
            'Ward',
            'Unit',
            'Has Voter Card',
            'Submitted At',
            'Imported At',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
