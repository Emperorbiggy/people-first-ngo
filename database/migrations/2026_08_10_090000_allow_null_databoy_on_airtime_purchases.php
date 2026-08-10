<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Airtime bought for an imported contact belongs to no databoy, so the link
 * has to be optional. Raw SQL keeps this dependency-free (no doctrine/dbal)
 * and preserves the existing foreign key.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('airtime_purchases', 'databoy_id')) {
            DB::statement('ALTER TABLE `airtime_purchases` MODIFY `databoy_id` BIGINT UNSIGNED NULL');
        }
    }

    public function down(): void
    {
        // Rows for imported contacts have no databoy, so they must go before
        // the column can be NOT NULL again.
        DB::table('airtime_purchases')->whereNull('databoy_id')->delete();

        if (Schema::hasColumn('airtime_purchases', 'databoy_id')) {
            DB::statement('ALTER TABLE `airtime_purchases` MODIFY `databoy_id` BIGINT UNSIGNED NOT NULL');
        }
    }
};
