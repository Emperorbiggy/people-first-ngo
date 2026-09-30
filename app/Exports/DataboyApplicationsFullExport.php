<?php

namespace App\Exports;

use App\Exports\Concerns\MapsDataboyApplicationRows;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;

/**
 * Every matching applicant in one file.
 *
 * Runs off the query rather than a fetched collection, so rows are hydrated a
 * chunk at a time and the whole table is never held in memory at once. This is
 * what makes a single download of the full register possible instead of asking
 * for fifteen separate batches and hoping none was missed.
 */
class DataboyApplicationsFullExport implements FromQuery, WithHeadings, WithMapping, WithStyles, ShouldAutoSize, WithChunkReading
{
    use MapsDataboyApplicationRows;

    public function __construct(private $query) {}

    public function query()
    {
        return $this->query;
    }

    /**
     * Rows hydrated per database round trip. 500 keeps memory flat without
     * making thousands of queries.
     */
    public function chunkSize(): int
    {
        return 500;
    }
}
