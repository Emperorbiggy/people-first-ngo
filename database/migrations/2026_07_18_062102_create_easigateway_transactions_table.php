<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('easigateway_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // credit | debit
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_after', 12, 2);
            $table->string('description');
            $table->nullableMorphs('reference');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('easigateway_transactions');
    }
};
