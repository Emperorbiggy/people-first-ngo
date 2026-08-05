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
        Schema::table('apo_officers', function (Blueprint $table) {
            $table->string('previous_full_name')->nullable()->after('qualified_by');
            $table->timestamp('replaced_at')->nullable()->after('previous_full_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('apo_officers', function (Blueprint $table) {
            $table->dropColumn(['previous_full_name', 'replaced_at']);
        });
    }
};
