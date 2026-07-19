<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accreditation_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('databoy_application_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('bank_name');
            $table->string('bank_code');
            $table->string('account_number');
            $table->string('account_name');
            $table->string('recipient_code')->nullable();
            $table->string('transfer_code')->nullable();
            $table->string('reference')->unique();
            $table->string('status');
            $table->text('message')->nullable();
            $table->timestamps();

            $table->index('databoy_application_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accreditation_payments');
    }
};
