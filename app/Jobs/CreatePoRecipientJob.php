<?php

namespace App\Jobs;

use App\Models\PoOfficer;
use App\Services\PaystackService;
use App\Support\BankMatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Creates the Paystack transfer recipient for one APO/PO officer.
 *
 * The account number is unique on po_officers, so two officers can never share
 * a payout account — the check that has to exist for recipients elsewhere in
 * this codebase is enforced by the schema here instead.
 *
 * Every step is logged: with 1500+ officers going through this, "why does this
 * one have no recipient" needs an answer that doesn't require re-running it.
 *
 * ShouldBeUnique keeps one officer to one queued job. Pressing "Generate
 * Recipients" twice used to queue the entire roster twice over, so the queue
 * filled with thousands of jobs that only no-op on arrival.
 */
class CreatePoRecipientJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 60;

    /** Long enough to outlive a backlog, short enough to self-heal. */
    public int $uniqueFor = 3600;

    public function __construct(public int $poOfficerId)
    {
    }

    public function uniqueId(): string
    {
        return (string) $this->poOfficerId;
    }

    public function handle(PaystackService $paystack): void
    {
        $log = fn (string $msg, array $ctx = []) => Log::info("[CreatePoRecipientJob #{$this->poOfficerId}] {$msg}", $ctx);

        $officer = PoOfficer::find($this->poOfficerId);

        if (!$officer) {
            Log::warning("[CreatePoRecipientJob #{$this->poOfficerId}] Aborted: officer not found.");
            return;
        }

        $log('Started.', [
            'name'           => $officer->full_name,
            'bank_name'      => $officer->bank_name,
            'bank_code'      => $officer->bank_code,
            'account_number' => $officer->account_number,
        ]);

        // Already has one — creating a second would just churn the API.
        if ($officer->recipient_status === 'success' && $officer->recipient_code) {
            $log('Skipped: recipient already exists.', ['recipient_code' => $officer->recipient_code]);
            return;
        }

        if (!$officer->bank_code) {
            $log('No bank code on file — attempting to match the bank name now.');

            $matcher = new BankMatcher($paystack);

            if (!$matcher->hasBanks()) {
                $this->fail($officer, 'Could not fetch the bank list from Paystack.', $log);
                return;
            }

            $code = $matcher->codeFor($officer->bank_name);

            if (!$code) {
                $this->fail($officer, "No Paystack bank matched \"{$officer->bank_name}\". Correct the bank name and retry.", $log);
                return;
            }

            $officer->update(['bank_code' => $code]);
            $log('Bank matched.', ['bank_name' => $officer->bank_name, 'bank_code' => $code]);
        }

        $log('Calling Paystack createRecipient.', [
            'bank_code'      => $officer->bank_code,
            'account_number' => $officer->account_number,
        ]);

        $result = $paystack->createRecipient([
            // Paystack names the recipient from the account itself; sending the
            // roster name keeps our own records readable.
            'name'           => $officer->account_name ?: $officer->full_name,
            'account_number' => $officer->account_number,
            'bank_code'      => $officer->bank_code,
        ]);

        if (!($result['status'] ?? false)) {
            $this->fail($officer, $result['message'] ?? 'Unable to create recipient.', $log);
            return;
        }

        $data = $result['data'] ?? [];

        $officer->update([
            'recipient_code'    => $data['recipient_code'] ?? null,
            'recipient_status'  => 'success',
            'recipient_message' => null,
            // Paystack resolves the real account name — trust it over the sheet.
            'account_name'      => $data['details']['account_name'] ?? $officer->account_name,
        ]);

        $log('Finished — recipient created.', [
            'recipient_code' => $data['recipient_code'] ?? null,
            'account_name'   => $data['details']['account_name'] ?? null,
        ]);
    }

    private function fail(PoOfficer $officer, string $message, callable $log): void
    {
        $officer->update([
            'recipient_status'  => 'failed',
            'recipient_message' => $message,
        ]);

        $log('Failed — recipient not created.', ['reason' => $message]);
    }
}
