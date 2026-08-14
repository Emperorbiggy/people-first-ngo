<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Keeps the rows an import rejected, with the reason and the line number from
 * the sheet.
 *
 * A bare count ("382 skipped") is not actionable across thousands of rows —
 * you cannot tell a genuine duplicate from a name that failed to parse without
 * knowing which line was dropped and why.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bulk_transfer_batches', function (Blueprint $table) {
            $table->unsignedInteger('rows_read')->default(0)->after('file_name');
            $table->unsignedInteger('skipped_count')->default(0)->after('rows_read');
            $table->json('skipped_rows')->nullable()->after('skipped_count');
        });
    }

    public function down(): void
    {
        Schema::table('bulk_transfer_batches', function (Blueprint $table) {
            $table->dropColumn(['rows_read', 'skipped_count', 'skipped_rows']);
        });
    }
};
