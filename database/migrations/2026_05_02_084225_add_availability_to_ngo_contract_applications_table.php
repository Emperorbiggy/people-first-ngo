<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ngo_contract_applications', function (Blueprint $table) {
            $table->string('availability')->nullable()->after('employment_status');
        });
    }

    public function down(): void
    {
        Schema::table('ngo_contract_applications', function (Blueprint $table) {
            $table->dropColumn('availability');
        });
    }
};
