<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('databoy_accreditation_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('databoy_id')->constrained()->cascadeOnDelete();
            $table->date('payment_date');
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

            $table->index(['databoy_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('databoy_accreditation_payments');
    }
};
