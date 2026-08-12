<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Payments to APO/PO officers.
 *
 * paid_key is the double-payment defence, same as apo_payments: it holds the
 * po_officer_id and carries a UNIQUE index, so winning that insert is what
 * grants the right to transfer. A second job for the same officer loses the
 * insert and stops. It is set back to NULL only when we know for certain no
 * money moved, which frees the officer for a genuine retry.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('po_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('po_officer_id')->constrained('po_officers')->cascadeOnDelete();
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
        Schema::dropIfExists('po_payments');
    }
};
