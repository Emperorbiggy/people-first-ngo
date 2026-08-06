<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The databoys table was shaped around the full field-registration form, where
 * every one of these is collected. Accreditation officers live in the same
 * table but are created by an admin from four fields — they have no ward, no
 * bank account, no browsing line. Rather than stuffing placeholder text into
 * columns that would then look like real data, the registration-only fields
 * become nullable. The registration form still requires them at validation.
 */
return new class extends Migration
{
    private const COLUMNS = [
        'gender', 'working_email', 'calling_phone_number', 'whatsapp_number',
        'state_of_residence', 'house_address', 'browsing_network', 'browsing_number',
        'bank_name', 'account_number', 'bank_account_name', 'employment_status',
    ];

    public function up(): void
    {
        Schema::table('databoys', function (Blueprint $table) {
            foreach (self::COLUMNS as $column) {
                $table->string($column)->nullable()->change();
            }

            $table->unsignedSmallInteger('age')->nullable()->change();
            $table->text('house_address')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Not reversed: rows created since (accreditation officers) hold NULLs
        // that would break a NOT NULL constraint being put back.
    }
};
