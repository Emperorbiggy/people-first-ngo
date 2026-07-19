<?php

namespace App\Jobs;

use App\Models\DataboyApplicantRecipient;
use App\Models\DataboyApplication;
use App\Services\PaystackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class CreateApplicantRecipientJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 90;

    public function __construct(public int $databoyApplicationId)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $application = DataboyApplication::find($this->databoyApplicationId);

        if (!$application) {
            return;
        }

        // Block duplicate payouts: if another applicant already has a
        // successfully created recipient for the same bank account, don't
        // create a second one for this applicant.
        $duplicate = DataboyApplicantRecipient::where('account_number', $application->account_number)
            ->where('bank_code', $application->bank_code)
            ->where('status', 'success')
            ->where('databoy_application_id', '!=', $application->id)
            ->with('application:id,full_name')
            ->first();

        if ($duplicate) {
            DataboyApplicantRecipient::updateOrCreate(
                ['databoy_application_id' => $application->id],
                [
                    'bank_name'      => $application->bank_name,
                    'bank_code'      => $application->bank_code,
                    'account_number' => $application->account_number,
                    'account_name'   => $application->bank_account_name,
                    'recipient_code' => null,
                    'status'         => 'failed',
                    'message'        => 'Duplicate account number — already used by ' . ($duplicate->application->full_name ?? 'another applicant') . '.',
                ]
            );

            return;
        }

        // Pace recipient-creation calls so a large "create all" run doesn't
        // burst past Paystack's rate limit.
        usleep(1000000);

        $recipient = $paystack->createRecipient([
            'name'           => $application->bank_account_name,
            'account_number' => $application->account_number,
            'bank_code'      => $application->bank_code,
        ]);

        DataboyApplicantRecipient::updateOrCreate(
            ['databoy_application_id' => $application->id],
            [
                'bank_name'      => $application->bank_name,
                'bank_code'      => $application->bank_code,
                'account_number' => $application->account_number,
                'account_name'   => $application->bank_account_name,
                'recipient_code' => $recipient['status'] ? $recipient['data']['recipient_code'] : null,
                'status'         => $recipient['status'] ? 'success' : 'failed',
                'message'        => $recipient['status'] ? null : ($recipient['message'] ?? 'Failed to create transfer recipient.'),
            ]
        );
    }
}
