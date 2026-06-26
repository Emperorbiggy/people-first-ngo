<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DataboyApplicationsExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    public function __construct(private $applications) {}

    public function collection()
    {
        return $this->applications->map(fn ($app) => [
            $app->id,
            $app->databoy?->full_name ?? '—',
            $app->full_name,
            $app->gender,
            $app->age,
            $app->email_address,
            $app->calling_phone_number,
            $app->whatsapp_number,
            $app->state_of_residence,
            $app->lga?->name ?? '',
            $app->ward?->name ?? '',
            $app->pollingUnit?->name ?? '',
            $app->house_address,
            $app->browsing_network,
            $app->browsing_number,
            $app->bank_name,
            $app->account_number,
            $app->bank_account_name,
            $app->employment_status,
            $app->availability ?? '',
            $app->current_occupation ?? '',
            $app->work_grade_level ?? '',
            $app->has_voter_card ? 'Yes' : 'No',
            $app->created_at->format('Y-m-d H:i'),
        ]);
    }

    public function headings(): array
    {
        return [
            'ID',
            'Registered By (Databoy)',
            'Full Name',
            'Gender',
            'Age',
            'Email Address',
            'Phone Number',
            'WhatsApp Number',
            'State of Residence',
            'LGA',
            'Ward',
            'Polling Unit',
            'House Address',
            'Browsing Network',
            'Browsing Number',
            'Bank Name',
            'Account Number',
            'Account Name',
            'Employment Status',
            'Availability',
            'Current Occupation',
            'Work Grade Level',
            'Has Voter Card',
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
