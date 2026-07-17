<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('databoy_applicant_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('databoy_application_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('bank_name');
            $table->string('bank_code');
            $table->string('account_number');
            $table->string('account_name');
            $table->string('recipient_code')->nullable();
            $table->string('status');
            $table->text('message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('databoy_applicant_recipients');
    }
};
