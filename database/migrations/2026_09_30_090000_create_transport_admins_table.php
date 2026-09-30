<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Accounts for the transport panel.
 *
 * Their own table and guard rather than a role on `users`: this panel exists so
 * a transport supervisor can be given the vehicle register without seeing
 * databoys, payments or system settings. Sharing the admin table would make
 * that separation a matter of remembering to check a role everywhere.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transport_admins', function (Blueprint $table) {
            $table->id();

            $table->string('full_name');
            $table->string('email')->unique();
            $table->string('phone_number')->nullable();
            $table->string('password');

            // Suspension is checked on every request, so access can be pulled
            // without deleting the account and losing who did what.
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();

            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_admins');
    }
};
