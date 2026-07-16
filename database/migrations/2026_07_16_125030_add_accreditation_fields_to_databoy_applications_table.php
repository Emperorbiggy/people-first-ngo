<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('databoy_applications', function (Blueprint $table) {
            $table->boolean('is_accredited')->default(false)->after('highest_qualification_certificate_path');
            $table->timestamp('accredited_at')->nullable()->after('is_accredited');
            $table->foreignId('accredited_by')->nullable()->after('accredited_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('databoy_applications', function (Blueprint $table) {
            $table->dropForeign(['accredited_by']);
            $table->dropColumn(['is_accredited', 'accredited_at', 'accredited_by']);
        });
    }
};
