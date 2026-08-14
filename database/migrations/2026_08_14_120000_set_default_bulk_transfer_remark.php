<?php

use App\Models\BulkTransferBatch;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Gives existing batches the standing narration.
 *
 * Batches imported before the remark existed have none, so their transfers
 * would go out labelled only by the code fallback. Backfilling means the value
 * is visible and editable on the page rather than implied.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('bulk_transfer_batches')
            ->whereNull('remark')
            ->orWhere('remark', '')
            ->update(['remark' => BulkTransferBatch::DEFAULT_REMARK]);
    }

    public function down(): void
    {
        DB::table('bulk_transfer_batches')
            ->where('remark', BulkTransferBatch::DEFAULT_REMARK)
            ->update(['remark' => null]);
    }
};
