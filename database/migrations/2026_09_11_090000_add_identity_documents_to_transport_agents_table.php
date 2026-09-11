<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who the agent actually is: their passport photograph, and one government ID
 * of their choosing with its number and a picture of the document.
 *
 * Nullable because agents registered before this existed have neither, and
 * their accounts must keep working.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transport_agents', function (Blueprint $table) {
            $table->string('passport_photograph_path')->nullable()->after('address');

            // NIN, Driver's Licence, Voter's Card or International Passport —
            // which one it is, so the number can be read correctly.
            $table->string('id_type')->nullable()->after('passport_photograph_path');
            $table->string('id_number')->nullable()->after('id_type');
            $table->string('id_document_path')->nullable()->after('id_number');

            // One ID, one agent. Phone and account are already unique, but a
            // person could otherwise register twice on a second phone and a
            // second account and be paid twice for the same work. NULLs do not
            // collide, so agents from before this change are unaffected.
            $table->unique('id_number');
        });
    }

    public function down(): void
    {
        Schema::table('transport_agents', function (Blueprint $table) {
            $table->dropUnique(['id_number']);
            $table->dropColumn([
                'passport_photograph_path',
                'id_type',
                'id_number',
                'id_document_path',
            ]);
        });
    }
};
