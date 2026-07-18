<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('airtime_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('databoy_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('phone_number');
            $table->string('network');
            $table->string('service_category_id')->nullable();
            $table->string('status'); // success | failed
            $table->text('message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('airtime_recipients');
    }
};
