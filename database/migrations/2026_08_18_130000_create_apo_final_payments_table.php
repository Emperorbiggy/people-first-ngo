<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * APO/PO final payment: a bank-details-only sheet paid once, on its own.
 *
 * Deliberately one table rather than a roster plus a payments table — a row IS
 * the payment here, so the two unique claims sit on it directly:
 *
 *   account_number — one row per bank account, so a sheet cannot carry the
 *                    same account twice and no re-import can add it again.
 *   paid_key       — holds the row id while a payment is live and NULL once
 *                    released, so one row can only ever produce one transfer.
 *
 * Both are database guarantees, not checks the code performs and hopes hold.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apo_final_payments', function (Blueprint $table) {
            $table->id();

            $table->string('bank_name');
            $table->string('bank_code')->nullable();
            $table->string('account_number');
            $table->string('account_name')->nullable();
            $table->decimal('amount', 12, 2);

            $table->string('recipient_code')->nullable();
            $table->string('recipient_status')->nullable();
            $table->text('recipient_message')->nullable();

            $table->unsignedBigInteger('paid_key')->nullable()->unique();
            $table->string('transfer_code')->nullable();
            $table->string('reference')->nullable()->unique();
            $table->string('payment_status')->nullable();
            $table->text('payment_message')->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->timestamps();

            $table->unique('account_number');
            $table->index('recipient_status');
            $table->index('payment_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apo_final_payments');
    }
};
