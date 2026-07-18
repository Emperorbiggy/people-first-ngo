<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('databoy_applications', function (Blueprint $table) {
            $table->string('accreditation_role')->nullable()->after('is_accredited');
            $table->string('check_in_photo_path')->nullable()->after('accreditation_role');
            $table->timestamp('checked_in_at')->nullable()->after('check_in_photo_path');
            $table->string('check_out_photo_path')->nullable()->after('checked_in_at');
            $table->timestamp('checked_out_at')->nullable()->after('check_out_photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('databoy_applications', function (Blueprint $table) {
            $table->dropColumn([
                'accreditation_role', 'check_in_photo_path', 'checked_in_at',
                'check_out_photo_path', 'checked_out_at',
            ]);
        });
    }
};
