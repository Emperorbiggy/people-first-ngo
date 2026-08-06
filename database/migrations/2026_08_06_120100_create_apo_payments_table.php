<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * APO officer payments — a pool of its own, separate from applicant_payments
 * and accreditation_payments. The same person can legitimately be paid from
 * each pool once; keeping them apart is what stops one payment from blocking
 * (or being mistaken for) another.
 *
 * paid_key is the double-payment defence. It holds the apo_officer_id for any
 * payment that is NOT a definite failure, and NULL for failed ones. Because it
 * carries a UNIQUE index and MySQL treats NULLs as distinct, the database
 * itself allows unlimited failed attempts but at most ONE live payment per
 * officer — two concurrent jobs cannot both get past the insert, no matter how
 * they are dispatched or how the app-level checks race.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apo_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('apo_officer_id')->constrained('apo_officers')->cascadeOnDelete();
            $table->foreignId('databoy_application_id')->constrained('databoy_applications')->cascadeOnDelete();
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

            $table->index('apo_officer_id', 'apo_payments_officer_idx');
            $table->index('databoy_application_id', 'apo_payments_application_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apo_payments');
    }
};
