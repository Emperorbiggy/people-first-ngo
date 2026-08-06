<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance', function (Blueprint $table) {
            $table->id();
            $table->string('surname');
            $table->string('firstname');
            $table->string('othernames')->nullable();
            // Attendees are all Osun state; lga is the required text as given,
            // lga_id is set when it matches a known Osun LGA.
            $table->string('lga');
            $table->foreignId('lga_id')->nullable()->constrained('lgas')->nullOnDelete();
            $table->string('phone_number');
            $table->boolean('present')->default(false);
            $table->timestamp('marked_present_at')->nullable();
            $table->timestamps();

            // Phone is how a re-uploaded list is matched to existing rows.
            $table->index('phone_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance');
    }
};
