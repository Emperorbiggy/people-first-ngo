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
            $table->string('lga')->nullable()->after('highest_qualification_certificate_path');
            $table->string('ward')->nullable()->after('lga');
            $table->string('unit')->nullable()->after('ward');
            $table->boolean('has_voter_card')->default(false)->after('unit');
        });
    }

    public function down(): void
    {
        Schema::table('ngo_contract_applications', function (Blueprint $table) {
            $table->dropColumn(['lga', 'ward', 'unit', 'has_voter_card']);
        });
    }
};
