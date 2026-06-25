<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('imported_contract_applications', function (Blueprint $table) {
            $table->foreignId('country_id')->nullable()->constrained()->nullOnDelete()->after('lga');
            $table->foreignId('lga_id')->nullable()->constrained()->nullOnDelete()->after('country_id');
            $table->foreignId('ward_id')->nullable()->constrained()->nullOnDelete()->after('lga_id');
            $table->foreignId('polling_unit_id')->nullable()->constrained()->nullOnDelete()->after('ward_id');
        });
    }

    public function down(): void
    {
        Schema::table('imported_contract_applications', function (Blueprint $table) {
            $table->dropForeign(['country_id']);
            $table->dropForeign(['lga_id']);
            $table->dropForeign(['ward_id']);
            $table->dropForeign(['polling_unit_id']);
            $table->dropColumn(['country_id', 'lga_id', 'ward_id', 'polling_unit_id']);
        });
    }
};
