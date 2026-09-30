<?php

namespace App\Exports;

use App\Exports\Concerns\MapsDataboyApplicationRows;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;

/**
 * One numbered batch of applicants, already fetched.
 *
 * Kept for the batch downloads, which stay small enough for shared hosting.
 * The whole table goes through DataboyApplicationsFullExport instead, which
 * streams rather than holding every row in memory.
 */
class DataboyApplicationsExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    use MapsDataboyApplicationRows;

    public function __construct(private $applications) {}

    public function collection()
    {
        return $this->applications;
    }
}
