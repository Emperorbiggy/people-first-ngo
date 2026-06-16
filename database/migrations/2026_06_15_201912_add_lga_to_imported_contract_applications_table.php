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
        Schema::table('imported_contract_applications', function (Blueprint $table) {
            $table->string('lga')->nullable()->after('has_voter_card');
        });
    }

    public function down(): void
    {
        Schema::table('imported_contract_applications', function (Blueprint $table) {
            $table->dropColumn('lga');
        });
    }
};
