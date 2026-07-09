<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Any status other than success/failed (e.g. a stale "pending" row from
        // before pending-at-initiation transfers were normalized to success in
        // code) represents a transfer Paystack already queued with OTP disabled.
        // Treat it as paid, matching DataboyPaymentController::pay() — otherwise
        // it silently blocks that databoy from ever being eligible again while
        // never showing as a retryable failure either.
        DB::table('databoy_payments')
            ->whereNotIn('status', ['success', 'failed'])
            ->update(['status' => 'success']);
    }

    public function down(): void
    {
        // Not reversible — original stale statuses aren't recorded anywhere.
    }
};
