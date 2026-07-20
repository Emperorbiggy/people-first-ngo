<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('party_agent_data_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('party_agent_id')->constrained()->cascadeOnDelete();
            $table->string('phone_number');
            $table->string('network');
            $table->string('service_category_id')->nullable();
            $table->string('bundle_code')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('status');
            $table->text('message')->nullable();
            $table->timestamps();

            $table->index('phone_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('party_agent_data_purchases');
    }
};
