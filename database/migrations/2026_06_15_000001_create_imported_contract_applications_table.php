<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('imported_contract_applications', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('phone_number');
            $table->string('whatsapp_number');
            $table->string('highest_qualification')->nullable();
            $table->string('ward')->nullable();
            $table->string('unit')->nullable();
            $table->boolean('has_voter_card')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('imported_contract_applications');
    }
};
