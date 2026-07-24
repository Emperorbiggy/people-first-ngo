<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DataboyAccreditationPaymentsExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    public function __construct(private $history) {}

    public function collection()
    {
        return $this->history->map(fn ($payment) => [
            $payment['full_name'],
            $payment['payment_date'],
            $payment['amount'],
            $payment['bank_name'],
            $payment['account_number'],
            $payment['account_name'],
            $payment['status'],
            $payment['message'],
            optional($payment['created_at'])->format('Y-m-d H:i'),
        ]);
    }

    public function headings(): array
    {
        return [
            'Databoy',
            'Payment Date',
            'Amount',
            'Bank Name',
            'Account Number',
            'Account Name',
            'Status',
            'Message',
            'Processed At',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
