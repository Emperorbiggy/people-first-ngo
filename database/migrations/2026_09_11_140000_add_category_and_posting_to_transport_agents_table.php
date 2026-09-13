<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which stream an agent works, and where they are posted.
 *
 * Category is fixed by the link they registered through — bike and maruwa on
 * one, korobe bus on the other — because the two are counted and paid apart.
 *
 * Nullable throughout: agents registered before the split have no category and
 * no posting, and their accounts must keep working.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transport_agents', function (Blueprint $table) {
            // bike_maruwa | korobe_bus
            $table->string('category')->nullable()->after('gender');

            // The line they browse on. Often a second SIM, so it is asked for
            // separately rather than assumed to be the phone number.
            $table->string('browsing_number')->nullable()->after('whatsapp_number');

            $table->string('zone')->nullable()->after('lga_name');
            $table->string('branch_name')->nullable()->after('zone');

            // Reporting is by stream within a local government, and by branch.
            $table->index(['category', 'lga_id']);
            $table->index('branch_name');
        });
    }

    public function down(): void
    {
        Schema::table('transport_agents', function (Blueprint $table) {
            $table->dropIndex(['category', 'lga_id']);
            $table->dropIndex(['branch_name']);
            $table->dropColumn(['category', 'browsing_number', 'zone', 'branch_name']);
        });
    }
};
