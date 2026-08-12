<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * APO/PO officers as a standalone roster — deliberately NOT joined to lgas,
 * wards or polling_units. The final posting is stored as plain text exactly as
 * supplied, so this module never depends on the geo tables matching.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('po_officers', function (Blueprint $table) {
            $table->id();

            $table->string('final_surname');
            $table->string('final_first_name');
            $table->string('final_other_name')->nullable();
            $table->string('phone_number');

            // Bank details come from either the databoy or the NGO record —
            // whichever was supplied. Code is nullable: plenty of rows arrive
            // without one, and the bank-match step fills those in later.
            $table->string('bank_name');
            $table->string('bank_code')->nullable();
            $table->string('account_number');
            $table->string('account_name')->nullable();

            $table->string('final_lga')->nullable();
            $table->string('final_pu')->nullable();
            $table->string('final_ra_ward')->nullable();
            $table->string('final_role')->nullable();

            // Paystack transfer recipient, created by CreatePoRecipientJob.
            $table->string('recipient_code')->nullable();
            $table->string('recipient_status')->nullable();
            $table->text('recipient_message')->nullable();

            $table->timestamps();

            // One roster entry per account number, so a re-import corrects
            // rather than duplicates, and two officers can't share a payout.
            $table->unique('account_number');
            $table->index('phone_number');
            $table->index('bank_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('po_officers');
    }
};
