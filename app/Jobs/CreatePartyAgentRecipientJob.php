<?php

namespace App\Jobs;

use App\Models\PartyAgent;
use App\Models\PartyAgentRecipient;
use App\Services\PaystackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class CreatePartyAgentRecipientJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 90;

    public function __construct(public int $partyAgentId)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $partyAgent = PartyAgent::find($this->partyAgentId);

        if (!$partyAgent) {
            return;
        }

        // Block duplicate payouts: if another party agent already has a
        // successfully created recipient for the same bank account, don't
        // create a second one for this party agent.
        $duplicate = PartyAgentRecipient::where('account_number', $partyAgent->account_number)
            ->where('bank_code', $partyAgent->bank_code)
            ->where('status', 'success')
            ->where('party_agent_id', '!=', $partyAgent->id)
            ->with('partyAgent:id,full_name')
            ->first();

        if ($duplicate) {
            PartyAgentRecipient::updateOrCreate(
                ['party_agent_id' => $partyAgent->id],
                [
                    'bank_name'      => $partyAgent->bank_name,
                    'bank_code'      => $partyAgent->bank_code,
                    'account_number' => $partyAgent->account_number,
                    'account_name'   => $partyAgent->bank_account_name,
                    'recipient_code' => null,
                    'status'         => 'failed',
                    'message'        => 'Duplicate account number — already used by ' . ($duplicate->partyAgent->full_name ?? 'another party agent') . '.',
                ]
            );

            return;
        }

        // Pace recipient-creation calls so a large "create all" run doesn't
        // burst past Paystack's rate limit.
        usleep(1000000);

        $recipient = $paystack->createRecipient([
            'name'           => $partyAgent->bank_account_name,
            'account_number' => $partyAgent->account_number,
            'bank_code'      => $partyAgent->bank_code,
        ]);

        PartyAgentRecipient::updateOrCreate(
            ['party_agent_id' => $partyAgent->id],
            [
                'bank_name'      => $partyAgent->bank_name,
                'bank_code'      => $partyAgent->bank_code,
                'account_number' => $partyAgent->account_number,
                'account_name'   => $partyAgent->bank_account_name,
                'recipient_code' => $recipient['status'] ? $recipient['data']['recipient_code'] : null,
                'status'         => $recipient['status'] ? 'success' : 'failed',
                'message'        => $recipient['status'] ? null : ($recipient['message'] ?? 'Failed to create transfer recipient.'),
            ]
        );
    }
}
