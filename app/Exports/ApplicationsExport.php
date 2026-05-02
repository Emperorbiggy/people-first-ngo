<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ApplicationsExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    public function __construct(private $applications) {}

    public function collection()
    {
        return $this->applications->map(fn ($app) => [
            $app->id,
            $app->full_name,
            $app->gender,
            $app->age,
            $app->email_address,
            $app->calling_phone_number,
            $app->whatsapp_number,
            $app->state_of_residence,
            $app->house_address,
            $app->browsing_network,
            $app->browsing_number,
            $app->bank_name,
            $app->bank_code,
            $app->account_number,
            $app->bank_account_name,
            $app->employment_status,
            $app->availability ?? '',
            $app->current_occupation ?? '',
            $app->work_grade_level ?? '',
            $app->created_at->format('Y-m-d H:i'),
        ]);
    }

    public function headings(): array
    {
        return [
            'ID',
            'Full Name',
            'Gender',
            'Age',
            'Email Address',
            'Phone Number',
            'WhatsApp Number',
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
            'Submitted At',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
