<?php

namespace App\Jobs;

use App\Models\PoOfficer;
use App\Services\PaystackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Creates the Paystack transfer recipient for one APO/PO officer.
 *
 * The account number is unique on po_officers, so two officers can never share
 * a payout account — the check that has to exist for recipients elsewhere in
 * this codebase is enforced by the schema here instead.
 */
class CreatePoRecipientJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 60;

    public function __construct(public int $poOfficerId)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $officer = PoOfficer::find($this->poOfficerId);

        if (!$officer) {
            return;
        }

        // Already has one — creating a second would just churn the API.
        if ($officer->recipient_status === 'success' && $officer->recipient_code) {
            return;
        }

        if (!$officer->bank_code) {
            $officer->update([
                'recipient_status'  => 'failed',
                'recipient_message' => 'No bank code — run Match Bank Codes first.',
            ]);
            return;
        }

        $result = $paystack->createRecipient([
            // Paystack names the recipient from the account itself; sending the
            // roster name keeps our own records readable.
            'name'           => $officer->account_name ?: $officer->full_name,
            'account_number' => $officer->account_number,
            'bank_code'      => $officer->bank_code,
        ]);

        if (!($result['status'] ?? false)) {
            $officer->update([
                'recipient_status'  => 'failed',
                'recipient_message' => $result['message'] ?? 'Unable to create recipient.',
            ]);
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
    }
}
