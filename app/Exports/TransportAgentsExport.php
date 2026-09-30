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
 * The agent register. Runs off the query with chunked reading, so the file size
 * is a function of the data and not of available memory.
 */
class TransportAgentsExport implements FromQuery, WithHeadings, WithMapping, WithStyles, ShouldAutoSize, WithChunkReading
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

    public function map($agent): array
    {
        return [
            $agent->id,
            $agent->full_name,
            $agent->category_label ?? '—',
            $agent->gender,
            $agent->phone_number,
            $agent->whatsapp_number,
            $agent->browsing_number,
            $agent->email,
            $agent->lga_name,
            $agent->zone,
            $agent->branch_name,
            $agent->address,
            $agent->bank_name,
            $agent->account_number,
            $agent->bank_account_name,
            $agent->vehicles_count ?? 0,
            $agent->is_active ? 'Active' : 'Suspended',
            $agent->passport_photograph_path ? 'Yes' : 'No',
            optional($agent->last_login_at)->format('Y-m-d H:i') ?? '',
            optional($agent->created_at)->format('Y-m-d H:i') ?? '',
        ];
    }

    public function headings(): array
    {
        return [
            'ID', 'Full Name', 'Stream', 'Gender',
            'Phone Number', 'WhatsApp', 'Browsing Data Number', 'Email',
            'LGA', 'Zone/Group', 'Branch',
            'Address',
            'Bank Name', 'Account Number', 'Account Name',
            'Vehicles Captured', 'Status', 'Passport On File',
            'Last Login', 'Registered At',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [1 => ['font' => ['bold' => true]]];
    }
}
