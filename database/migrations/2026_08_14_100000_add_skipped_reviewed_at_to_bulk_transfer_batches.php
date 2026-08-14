<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Marks a batch's skipped-rows list as dealt with, so the panel stops showing
 * once it has been downloaded or dismissed. The rows themselves are kept.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bulk_transfer_batches', function (Blueprint $table) {
            $table->timestamp('skipped_reviewed_at')->nullable()->after('skipped_rows');
        });
    }

    public function down(): void
    {
        Schema::table('bulk_transfer_batches', function (Blueprint $table) {
            $table->dropColumn('skipped_reviewed_at');
        });
    }
};
