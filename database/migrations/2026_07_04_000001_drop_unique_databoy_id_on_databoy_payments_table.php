<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add a plain index first so the foreign key still has index backing
        // once the unique index below is dropped.
        Schema::table('databoy_payments', function (Blueprint $table) {
            $table->index('databoy_id', 'databoy_payments_databoy_id_idx');
        });

        Schema::table('databoy_payments', function (Blueprint $table) {
            $table->dropUnique(['databoy_id']);
        });
    }

    public function down(): void
    {
        Schema::table('databoy_payments', function (Blueprint $table) {
            $table->dropIndex('databoy_payments_databoy_id_idx');
            $table->unique('databoy_id');
        });
    }
};
