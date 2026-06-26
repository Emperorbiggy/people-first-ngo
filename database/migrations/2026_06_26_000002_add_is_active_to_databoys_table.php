<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('databoys', function (Blueprint $table) {
            $table->boolean('is_active')->default(false)->after('login_password_plain');
        });
    }

    public function down(): void
    {
        Schema::table('databoys', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });
    }
};
