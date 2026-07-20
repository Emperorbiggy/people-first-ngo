<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ward_time_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ward_id')->constrained()->cascadeOnDelete();
            $table->date('override_date');
            $table->string('checkin_start', 5);
            $table->string('checkin_end', 5);
            $table->string('checkout_start', 5);
            $table->string('checkout_end', 5);
            $table->timestamps();
            $table->unique(['ward_id', 'override_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ward_time_overrides');
    }
};
