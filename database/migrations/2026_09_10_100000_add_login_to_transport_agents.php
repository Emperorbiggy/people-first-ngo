<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Login credentials for transport agents.
 *
 * login_password_plain sits beside the hash, the same way databoy logins work
 * in this codebase, so an admin can read a credential back out to someone who
 * has lost it. The hash is what authenticates.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transport_agents', function (Blueprint $table) {
            // The phone number doubles as the login, so it is what they already
            // know — no extra thing to remember or mistype.
            $table->string('login_password_plain')->nullable()->after('bank_account_name');
            $table->string('password')->nullable()->after('login_password_plain');
            $table->boolean('is_active')->default(true)->after('password');
            $table->string('role')->default('transport_agent')->after('is_active');
            $table->timestamp('last_login_at')->nullable()->after('role');
            $table->rememberToken();
        });
    }

    public function down(): void
    {
        Schema::table('transport_agents', function (Blueprint $table) {
            $table->dropColumn([
                'login_password_plain', 'password', 'is_active', 'role', 'last_login_at', 'remember_token',
            ]);
        });
    }
};
