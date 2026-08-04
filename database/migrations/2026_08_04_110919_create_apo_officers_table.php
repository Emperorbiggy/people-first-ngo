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
        Schema::create('apo_officers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('databoy_application_id')->unique()->constrained('databoy_applications')->cascadeOnDelete();
            $table->foreignId('qualified_by')->nullable()->constrained('databoys')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('apo_officers');
    }
};
