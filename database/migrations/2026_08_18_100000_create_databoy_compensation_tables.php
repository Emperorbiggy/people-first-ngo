<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Databoy compensation: a name and an LGA are uploaded, matched against the
 * databoy roster, approved by a human, then paid.
 *
 * The uploaded name is kept exactly as supplied and never overwritten — the
 * match is a judgement someone made, and the original is what that judgement
 * has to be checked against later.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('databoy_compensations', function (Blueprint $table) {
            $table->id();

            $table->string('uploaded_name');
            $table->string('uploaded_lga');
            $table->foreignId('lga_id')->nullable()->constrained('lgas')->nullOnDelete();

            // Set when someone approves a specific databoy as the match.
            $table->foreignId('databoy_id')->nullable()->constrained('databoys')->nullOnDelete();
            $table->decimal('amount', 12, 2)->nullable();

            // pending → approved → (paid, via the payments table) | rejected
            $table->string('status')->default('pending');
            $table->timestamp('approved_at')->nullable();
            $table->text('note')->nullable();

            $table->timestamps();

            $table->index('status');
            $table->index('databoy_id');
        });

        Schema::create('databoy_compensation_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('databoy_compensation_id')->constrained('databoy_compensations')->cascadeOnDelete();
            $table->foreignId('databoy_id')->nullable()->constrained('databoys')->nullOnDelete();

            // Holds the compensation row id under a UNIQUE index: winning this
            // insert is what grants the right to transfer, so a duplicate
            // dispatch loses it and stops before calling Paystack.
            $table->unsignedBigInteger('paid_key')->nullable()->unique();

            $table->decimal('amount', 12, 2);
            $table->string('bank_name')->nullable();
            $table->string('bank_code')->nullable();
            $table->string('account_number')->nullable();
            $table->string('account_name')->nullable();

            $table->string('recipient_code')->nullable();
            $table->string('transfer_code')->nullable();
            $table->string('reference')->unique();
            $table->string('status');
            $table->text('message')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('databoy_compensation_payments');
        Schema::dropIfExists('databoy_compensations');
    }
};
