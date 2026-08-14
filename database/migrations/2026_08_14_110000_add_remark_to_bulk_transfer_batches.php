<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A default narration for the whole batch, used as Paystack's transfer reason
 * when a row carries no remark of its own.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bulk_transfer_batches', function (Blueprint $table) {
            $table->string('remark')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('bulk_transfer_batches', function (Blueprint $table) {
            $table->dropColumn('remark');
        });
    }
};
