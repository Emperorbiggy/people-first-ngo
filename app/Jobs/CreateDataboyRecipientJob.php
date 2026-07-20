<?php

namespace App\Jobs;

use App\Models\Databoy;
use App\Models\DataboyRecipient;
use App\Services\PaystackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class CreateDataboyRecipientJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 90;

    public function __construct(public int $databoyId)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $databoy = Databoy::find($this->databoyId);

        if (!$databoy) {
            return;
        }

        // Block duplicate payouts: if another databoy already has a
        // successfully created recipient for the same bank account, don't
        // create a second one for this databoy.
        $duplicate = DataboyRecipient::where('account_number', $databoy->account_number)
            ->where('bank_code', $databoy->bank_code)
            ->where('status', 'success')
            ->where('databoy_id', '!=', $databoy->id)
            ->with('databoy:id,full_name')
            ->first();

        if ($duplicate) {
            DataboyRecipient::updateOrCreate(
                ['databoy_id' => $databoy->id],
                [
                    'bank_name'      => $databoy->bank_name,
                    'bank_code'      => $databoy->bank_code,
                    'account_number' => $databoy->account_number,
                    'account_name'   => $databoy->bank_account_name,
                    'recipient_code' => null,
                    'status'         => 'failed',
                    'message'        => 'Duplicate account number — already used by ' . ($duplicate->databoy->full_name ?? 'another databoy') . '.',
                ]
            );

            return;
        }

        usleep(1000000);

        $recipient = $paystack->createRecipient([
            'name'           => $databoy->bank_account_name,
            'account_number' => $databoy->account_number,
            'bank_code'      => $databoy->bank_code,
        ]);

        DataboyRecipient::updateOrCreate(
            ['databoy_id' => $databoy->id],
            [
                'bank_name'      => $databoy->bank_name,
                'bank_code'      => $databoy->bank_code,
                'account_number' => $databoy->account_number,
                'account_name'   => $databoy->bank_account_name,
                'recipient_code' => $recipient['status'] ? $recipient['data']['recipient_code'] : null,
                'status'         => $recipient['status'] ? 'success' : 'failed',
                'message'        => $recipient['status'] ? null : ($recipient['message'] ?? 'Failed to create transfer recipient.'),
            ]
        );
    }
}
