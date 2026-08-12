<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Imported bulk-transfer list: arbitrary people to pay, with their Paystack
 * transfer recipient resolved at import time.
 *
 * bulk_transfer_payments.paid_key is the double-payment defence — it holds the
 * recipient row id under a UNIQUE index, so winning that insert is what grants
 * the right to transfer. It is released to NULL only when we know for certain
 * that no money moved.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bulk_transfer_recipients', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('bank_name');
            $table->string('bank_code')->nullable();
            $table->string('account_number');
            $table->string('account_name')->nullable();

            $table->string('recipient_code')->nullable();
            $table->string('recipient_status')->nullable();
            $table->text('recipient_message')->nullable();

            $table->timestamps();

            // One entry per account number: a corrected re-import updates in
            // place, and two people can never share a payout account.
            $table->unique('account_number');
            $table->index('recipient_status');
        });

        Schema::create('bulk_transfer_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bulk_transfer_recipient_id')->constrained('bulk_transfer_recipients')->cascadeOnDelete();
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
        Schema::dropIfExists('bulk_transfer_payments');
        Schema::dropIfExists('bulk_transfer_recipients');
    }
};
