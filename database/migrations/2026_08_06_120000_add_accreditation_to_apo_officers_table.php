<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * APO accreditation is tracked on the apo_officers row itself, NOT on the
 * databoy_applications columns of the same name. An APO officer is also an
 * applicant and may already have been checked in, accredited and paid as one —
 * reusing those columns would conflate the two and corrupt both audits.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('apo_officers', function (Blueprint $table) {
            $table->boolean('is_suitable')->nullable()->after('replaced_at');
            $table->string('check_in_photo_path')->nullable()->after('is_suitable');
            $table->timestamp('checked_in_at')->nullable()->after('check_in_photo_path');
            $table->string('check_out_photo_path')->nullable()->after('checked_in_at');
            $table->timestamp('checked_out_at')->nullable()->after('check_out_photo_path');
            $table->boolean('is_accredited')->default(false)->after('checked_out_at');
            $table->timestamp('accredited_at')->nullable()->after('is_accredited');
            $table->foreignId('accredited_by_databoy_id')->nullable()->after('accredited_at')
                ->constrained('databoys')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('apo_officers', function (Blueprint $table) {
            $table->dropForeign(['accredited_by_databoy_id']);
            $table->dropColumn([
                'is_suitable', 'check_in_photo_path', 'checked_in_at',
                'check_out_photo_path', 'checked_out_at',
                'is_accredited', 'accredited_at', 'accredited_by_databoy_id',
            ]);
        });
    }
};
