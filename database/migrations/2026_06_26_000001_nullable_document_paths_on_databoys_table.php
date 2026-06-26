<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('databoys', function (Blueprint $table) {
            $table->string('passport_photograph_path')->nullable()->change();
            $table->string('valid_id_card_path')->nullable()->change();
            $table->string('highest_qualification_certificate_path')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('databoys', function (Blueprint $table) {
            $table->string('passport_photograph_path')->nullable(false)->change();
            $table->string('valid_id_card_path')->nullable(false)->change();
            $table->string('highest_qualification_certificate_path')->nullable(false)->change();
        });
    }
};
