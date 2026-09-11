<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Vehicles captured in the field by a transport agent, with their owner.
 *
 * Category splits the work in two — buses on one side, motorcycles and
 * tricycles on the other — because they are counted and reported separately.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registered_vehicles', function (Blueprint $table) {
            $table->id();

            // Who captured it, and where. LGA is copied from the agent at
            // capture time so a record still reads correctly if the agent is
            // ever moved to another local government.
            $table->foreignId('transport_agent_id')->constrained('transport_agents')->cascadeOnDelete();
            $table->foreignId('lga_id')->nullable()->constrained('lgas')->nullOnDelete();
            $table->string('lga_name')->nullable();

            $table->string('category');        // bus | motorcycle_tricycle
            $table->string('vehicle_type');    // Bus, Car, Motorcycle, Tricycle…
            $table->string('plate_number');
            $table->string('make_model')->nullable();
            $table->string('colour')->nullable();
            $table->unsignedSmallInteger('capacity')->nullable();

            $table->string('owner_name');
            $table->string('owner_phone');
            $table->string('owner_address')->nullable();

            $table->string('vehicle_photo_path')->nullable();
            $table->string('owner_photo_path')->nullable();

            $table->timestamps();

            // One registration per vehicle, across every agent — the same
            // vehicle cannot be captured twice for two payouts.
            $table->unique('plate_number');
            $table->index(['transport_agent_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registered_vehicles');
    }
};
