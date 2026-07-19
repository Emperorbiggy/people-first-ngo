<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_plans', function (Blueprint $table) {
            $table->id();
            $table->string('network')->unique(); // e.g. MTN, AIRTEL, 9Mobile, GLO
            $table->string('service_category_id'); // that network's data category _id
            $table->string('bundle_code');
            $table->decimal('amount', 12, 2);
            $table->string('validity')->nullable(); // human-readable description, e.g. "1.1GB + 1.5GB nite@N1000 1month"
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_plans');
    }
};
