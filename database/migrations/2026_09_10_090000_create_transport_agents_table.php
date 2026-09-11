<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * People who will go out and register transportation vehicles and their owners.
 *
 * This is the agent's own record — no vehicle details. LGA only: the work is
 * assigned by local government, so ward and polling unit are not asked for.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transport_agents', function (Blueprint $table) {
            $table->id();

            $table->string('full_name');
            $table->string('phone_number');
            $table->string('whatsapp_number')->nullable();
            $table->string('email')->nullable();
            $table->string('gender');
            $table->string('address')->nullable();

            // Osun LGA the agent will cover. Kept by id and by name so the
            // record still reads correctly if an LGA is ever renamed.
            $table->foreignId('lga_id')->constrained('lgas');
            $table->string('lga_name');

            $table->string('bank_name');
            $table->string('bank_code');
            $table->string('account_number');
            // Resolved by Paystack, never typed — this is the bank's answer.
            $table->string('bank_account_name');

            $table->timestamps();

            // One registration per account, and one per phone. A repeat
            // submission with either corrects that record rather than adding a
            // rival one, and two people cannot claim the same payout account.
            $table->unique('account_number');
            $table->unique('phone_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_agents');
    }
};
