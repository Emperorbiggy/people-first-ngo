<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Check-in replaces bulk transfer as the way APO/PO officers get paid: a
 * check-in officer confirms the person is present and the payment fires from
 * that action. There is deliberately no checkout.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('po_officers', function (Blueprint $table) {
            $table->timestamp('checked_in_at')->nullable()->after('recipient_message');
            // The databoy row of the check-in officer who confirmed them.
            $table->foreignId('checked_in_by')->nullable()->after('checked_in_at')
                ->constrained('databoys')->nullOnDelete();
            $table->index('checked_in_at');
        });
    }

    public function down(): void
    {
        Schema::table('po_officers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('checked_in_by');
            $table->dropColumn('checked_in_at');
        });
    }
};
