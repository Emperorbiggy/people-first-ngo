<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Full officer record alongside the payment — the sheet has to stand on its
 * own for reconciliation, so identity, posting (LGA/ward/polling unit), payout
 * account and payment outcome all travel together.
 */
class ApoPaymentsExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    public function __construct(private $payments) {}

    public function collection()
    {
        return $this->payments->map(fn ($p) => [
            $p['full_name'],
            $p['gender'],
            // Phone/account as strings so Excel keeps leading zeros.
            (string) $p['phone_number'],
            $p['lga'],
            $p['ward'],
            $p['polling_unit'],
            $p['accredited_at'],
            $p['bank_name'],
            (string) $p['account_number'],
            $p['account_name'],
            $p['amount'],
            ucfirst($p['status']),
            $p['message'],
            $p['reference'],
            $p['paid_at'],
        ]);
    }

    public function headings(): array
    {
        return [
            'Full Name',
            'Gender',
            'Phone Number',
            'LGA',
            'Ward',
            'Polling Unit',
            'Accredited At',
            'Bank Name',
            'Account Number',
            'Account Name',
            'Amount',
            'Payment Status',
            'Message',
            'Reference',
            'Payment Date',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->getStyle('C')->getNumberFormat()->setFormatCode('@');
        $sheet->getStyle('I')->getNumberFormat()->setFormatCode('@');

        return [1 => ['font' => ['bold' => true]]];
    }
}
