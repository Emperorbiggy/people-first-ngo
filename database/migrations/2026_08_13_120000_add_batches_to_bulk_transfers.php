<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Turns the bulk-transfer list into named batches.
 *
 * Each import becomes a batch you can act on independently: match its bank
 * codes, create its recipients, pay it. Amount moves onto the row, because
 * every person in a sheet can be owed a different sum.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bulk_transfer_batches', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();   // human-facing identifier
            $table->string('name');
            $table->string('file_name')->nullable();
            $table->timestamps();
        });

        Schema::table('bulk_transfer_recipients', function (Blueprint $table) {
            $table->foreignId('batch_id')->nullable()->after('id')
                ->constrained('bulk_transfer_batches')->cascadeOnDelete();

            $table->string('gender')->nullable()->after('full_name');
            $table->string('duty_post')->nullable()->after('account_name');
            $table->string('source_identity')->nullable()->after('duty_post');
            // Each row carries what that person is owed.
            $table->decimal('amount', 12, 2)->nullable()->after('source_identity');
            $table->string('remark')->nullable()->after('amount');
        });

        // The same account may legitimately appear in two different batches —
        // someone paid in March and again in April — so uniqueness is per
        // batch, not global. Within one batch it still cannot repeat.
        Schema::table('bulk_transfer_recipients', function (Blueprint $table) {
            $table->dropUnique('bulk_transfer_recipients_account_number_unique');
            $table->unique(['batch_id', 'account_number']);
        });
    }

    public function down(): void
    {
        Schema::table('bulk_transfer_recipients', function (Blueprint $table) {
            $table->dropUnique(['batch_id', 'account_number']);
            $table->dropConstrainedForeignId('batch_id');
            $table->dropColumn(['gender', 'duty_post', 'source_identity', 'amount', 'remark']);
            $table->unique('account_number');
        });

        Schema::dropIfExists('bulk_transfer_batches');
    }
};
