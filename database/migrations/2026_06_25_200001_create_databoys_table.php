<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('databoys', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('gender');
            $table->unsignedSmallInteger('age');
            $table->string('working_email');
            $table->string('calling_phone_number');
            $table->string('whatsapp_number');
            $table->string('state_of_residence');
            $table->foreignId('state_id')->nullable()->constrained('states')->nullOnDelete();
            $table->foreignId('lga_id')->nullable()->constrained('lgas')->nullOnDelete();
            $table->foreignId('ward_id')->nullable()->unique()->constrained('wards')->nullOnDelete();
            $table->text('house_address');
            $table->string('browsing_network');
            $table->string('browsing_number');
            $table->string('bank_name');
            $table->string('bank_code')->nullable();
            $table->string('account_number');
            $table->string('bank_account_name');
            $table->string('employment_status');
            $table->string('availability')->nullable();
            $table->string('passport_photograph_path');
            $table->string('valid_id_card_path');
            $table->string('highest_qualification_certificate_path');
            $table->string('login_email')->unique();
            $table->string('login_password_plain');
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('databoys');
    }
};
