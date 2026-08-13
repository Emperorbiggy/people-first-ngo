<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PayPoOfficerJob checks this column on every payment to make sure an account
 * has not already been paid, so it needs an index — the roster runs to
 * thousands of rows and that check happens once per check-in.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('po_payments', function (Blueprint $table) {
            $table->index('account_number');
        });
    }

    public function down(): void
    {
        Schema::table('po_payments', function (Blueprint $table) {
            $table->dropIndex(['account_number']);
        });
    }
};
