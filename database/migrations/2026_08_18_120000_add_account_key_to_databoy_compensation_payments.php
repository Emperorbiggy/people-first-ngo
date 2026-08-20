<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Makes "one payment per bank account" a database guarantee rather than a
 * check the code performs and hopes nothing changed underneath it.
 *
 * account_key holds the account number for a live payment and NULL once
 * released, exactly as paid_key does for the compensation row. MySQL allows
 * many NULLs in a unique index but only one of any given value, so a second
 * live payment to the same account cannot be inserted at all — no ordering,
 * timing or worker count can defeat it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('databoy_compensation_payments', function (Blueprint $table) {
            $table->string('account_key')->nullable()->unique()->after('paid_key');
        });
    }

    public function down(): void
    {
        Schema::table('databoy_compensation_payments', function (Blueprint $table) {
            $table->dropUnique(['account_key']);
            $table->dropColumn('account_key');
        });
    }
};
