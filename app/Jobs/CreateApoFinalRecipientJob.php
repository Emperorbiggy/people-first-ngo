<?php

namespace App\Jobs;

use App\Models\ApoFinalPayment;
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
 * Creates the Paystack transfer recipient for one APO/PO final payment row,
 * matching the bank name to a code first where the sheet didn't supply one.
 *
 * ShouldBeUnique keeps one row to one queued job, so pressing the button twice
 * doesn't queue the whole sheet twice over.
 */
class CreateApoFinalRecipientJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 60;
    public int $uniqueFor = 3600;

    public function __construct(public int $rowId)
    {
    }

    public function uniqueId(): string
    {
        return (string) $this->rowId;
    }

    public function handle(PaystackService $paystack): void
    {
        $log = fn (string $msg, array $ctx = []) => Log::info("[CreateApoFinalRecipientJob #{$this->rowId}] {$msg}", $ctx);

        $row = ApoFinalPayment::find($this->rowId);

        if (!$row) {
            return;
        }

        // Already resolved — a second call would only churn the API.
        if ($row->recipient_status === 'success' && $row->recipient_code) {
            $log('Skipped: recipient already exists.');
            return;
        }

        if (!$row->bank_code) {
            $matcher = new BankMatcher($paystack);

            if (!$matcher->hasBanks()) {
                $this->fail($row, 'Could not fetch the bank list from Paystack.', $log);
                return;
            }

            $code = $matcher->codeFor($row->bank_name);

            if (!$code) {
                $this->fail($row, "No Paystack bank matched \"{$row->bank_name}\". Correct the bank name and retry.", $log);
                return;
            }

            $row->update(['bank_code' => $code]);
            $log('Bank matched.', ['bank_name' => $row->bank_name, 'bank_code' => $code]);
        }

        // Pace calls so a large sheet doesn't burst past Paystack's rate limit.
        usleep(1000000);

        $result = $paystack->createRecipient([
            'name'           => $row->account_name ?: ('Account ' . $row->account_number),
            'account_number' => $row->account_number,
            'bank_code'      => $row->bank_code,
        ]);

        if (!($result['status'] ?? false)) {
            $this->fail($row, $result['message'] ?? 'Unable to create recipient.', $log);
            return;
        }

        $data = $result['data'] ?? [];

        $row->update([
            'recipient_code'    => $data['recipient_code'] ?? null,
            'recipient_status'  => 'success',
            'recipient_message' => null,
            // Paystack resolves the real account name — trust it over the sheet.
            'account_name'      => $data['details']['account_name'] ?? $row->account_name,
        ]);

        $log('Finished — recipient created.', ['recipient_code' => $data['recipient_code'] ?? null]);
    }

    private function fail(ApoFinalPayment $row, string $message, callable $log): void
    {
        $row->update(['recipient_status' => 'failed', 'recipient_message' => $message]);
        $log('Failed — recipient not created.', ['reason' => $message]);
    }
}
