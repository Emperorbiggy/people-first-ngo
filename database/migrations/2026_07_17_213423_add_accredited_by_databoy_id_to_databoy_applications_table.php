<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('databoy_applications', function (Blueprint $table) {
            $table->foreignId('accredited_by_databoy_id')->nullable()->after('accredited_by')->constrained('databoys')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('databoy_applications', function (Blueprint $table) {
            $table->dropForeign(['accredited_by_databoy_id']);
            $table->dropColumn('accredited_by_databoy_id');
        });
    }
};
