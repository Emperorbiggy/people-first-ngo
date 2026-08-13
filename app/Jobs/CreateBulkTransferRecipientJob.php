<?php

namespace App\Jobs;

use App\Models\BulkTransferRecipient;
use App\Services\PaystackService;
use App\Support\BankMatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Resolves one imported row into a usable payout target: matches the written
 * bank name to a Paystack bank code when none was supplied, then creates the
 * transfer recipient.
 *
 * Both steps live in the same job so an import only has to queue one chain, and
 * a row that fails at either step carries its own reason.
 */
class CreateBulkTransferRecipientJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 60;

    public function __construct(public int $recipientId)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $row = BulkTransferRecipient::find($this->recipientId);

        if (!$row) {
            return;
        }

        // Already resolved — a second call would only churn the API.
        if ($row->recipient_status === 'success' && $row->recipient_code) {
            return;
        }

        if (!$row->bank_code) {
            $matcher = new BankMatcher($paystack);

            if (!$matcher->hasBanks()) {
                $row->update([
                    'recipient_status'  => 'failed',
                    'recipient_message' => 'Could not fetch the bank list from Paystack.',
                ]);
                return;
            }

            $code = $matcher->codeFor($row->bank_name);

            if (!$code) {
                $row->update([
                    'recipient_status'  => 'failed',
                    'recipient_message' => "No Paystack bank matched \"{$row->bank_name}\". Correct the bank name and retry.",
                ]);
                return;
            }

            $row->update(['bank_code' => $code]);
        }

        // Pace recipient-creation calls so a large import doesn't burst past
        // Paystack's rate limit — same as CreateApplicantRecipientJob.
        usleep(1000000);

        $result = $paystack->createRecipient([
            'name'           => $row->account_name ?: $row->full_name,
            'account_number' => $row->account_number,
            'bank_code'      => $row->bank_code,
        ]);

        if (!($result['status'] ?? false)) {
            $row->update([
                'recipient_status'  => 'failed',
                'recipient_message' => $result['message'] ?? 'Unable to create recipient.',
            ]);
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
    }
}
