<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('e_forms', function (Blueprint $table) {
            if (!Schema::hasColumn('e_forms', 'bank_account_name')) {
                // The name Paystack returns for the account — resolved
                // server-side, never taken from the browser.
                $table->string('bank_account_name')->nullable()->after('bank_code');
            }
        });
    }

    public function down(): void
    {
        Schema::table('e_forms', function (Blueprint $table) {
            if (Schema::hasColumn('e_forms', 'bank_account_name')) {
                $table->dropColumn('bank_account_name');
            }
        });
    }
};
