<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('party_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('registered_by')->constrained('databoys')->cascadeOnDelete();
            $table->string('full_name');
            $table->string('gender');
            $table->unsignedSmallInteger('age');
            $table->string('email_address');
            $table->string('calling_phone_number');
            $table->string('whatsapp_number');
            $table->string('state_of_residence');
            $table->foreignId('lga_id')->nullable()->constrained('lgas')->nullOnDelete();
            $table->foreignId('ward_id')->nullable()->constrained('wards')->nullOnDelete();
            $table->foreignId('polling_unit_id')->nullable()->constrained('polling_units')->nullOnDelete();
            $table->text('house_address');
            $table->string('browsing_network');
            $table->string('browsing_number');
            $table->string('bank_name');
            $table->string('bank_code')->nullable();
            $table->string('account_number');
            $table->string('bank_account_name');
            $table->string('employment_status');
            $table->string('availability')->nullable();
            $table->string('current_occupation')->nullable();
            $table->string('work_grade_level')->nullable();
            $table->boolean('has_voter_card')->default(false);
            $table->string('passport_photograph_path');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('party_agents');
    }
};
