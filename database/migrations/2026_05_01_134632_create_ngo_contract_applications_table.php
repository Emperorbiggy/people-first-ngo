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
        Schema::create('ngo_contract_applications', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('email_address');
            $table->string('calling_phone_number');
            $table->string('whatsapp_number');
            $table->string('state_of_residence');
            $table->text('house_address');
            $table->string('browsing_network');
            $table->string('browsing_number');
            $table->string('bank_name');
            $table->string('account_number');
            $table->string('bank_account_name');
            $table->string('employment_status');
            $table->string('current_occupation')->nullable();
            $table->string('work_grade_level')->nullable();
            $table->string('passport_photograph_path');
            $table->string('valid_id_card_path');
            $table->string('highest_qualification_certificate_path');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ngo_contract_applications');
    }
};
