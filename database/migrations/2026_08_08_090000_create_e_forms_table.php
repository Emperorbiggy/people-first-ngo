<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('e_forms', function (Blueprint $table) {
            $table->id();
            $table->string('application_id');
            $table->string('full_name');
            $table->string('phone_number');
            // LGA of training — always an Osun LGA, kept by id and by name so
            // the submission still reads correctly if an LGA is ever renamed.
            $table->foreignId('lga_id')->constrained('lgas');
            $table->string('lga_of_training');
            $table->string('gender');
            $table->string('account_number');
            $table->string('bank_name');
            $table->string('bank_code')->nullable();
            $table->timestamps();

            // One submission per application — a resubmission updates in place
            // rather than creating a second, conflicting record.
            $table->unique('application_id');
            $table->index('phone_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('e_forms');
    }
};
