<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('easigateway_fundings', function (Blueprint $table) {
            $table->decimal('fee_amount', 12, 2)->nullable()->after('amount');
            $table->decimal('total_amount', 12, 2)->nullable()->after('fee_amount');
        });
    }

    public function down(): void
    {
        Schema::table('easigateway_fundings', function (Blueprint $table) {
            $table->dropColumn(['fee_amount', 'total_amount']);
        });
    }
};
