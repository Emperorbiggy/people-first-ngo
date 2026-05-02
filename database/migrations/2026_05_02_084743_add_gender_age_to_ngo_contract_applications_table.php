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
            $table->string('gender')->nullable()->after('full_name');
            $table->unsignedTinyInteger('age')->nullable()->after('gender');
        });
    }

    public function down(): void
    {
        Schema::table('ngo_contract_applications', function (Blueprint $table) {
            $table->dropColumn(['gender', 'age']);
        });
    }
};
