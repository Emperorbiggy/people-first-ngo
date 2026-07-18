<?php

namespace App\Jobs;

use App\Models\AirtimeRecipient;
use App\Models\Databoy;
use App\Services\EasiGatewayService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class CreateAirtimeRecipientJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 60;

    public function __construct(public int $databoyId)
    {
    }

    public function handle(EasiGatewayService $easiGateway): void
    {
        $databoy = Databoy::find($this->databoyId);

        if (!$databoy) {
            return;
        }

        if (!$databoy->browsing_network || !$databoy->browsing_number) {
            $this->record($databoy, null, null, 'failed', 'Missing browsing network or phone number.');
            return;
        }

        // Block duplicate payouts: if another databoy already has a
        // successfully created recipient for the same phone number, skip.
        $duplicate = AirtimeRecipient::where('phone_number', $databoy->browsing_number)
            ->where('status', 'success')
            ->where('databoy_id', '!=', $databoy->id)
            ->with('databoy:id,full_name')
            ->first();

        if ($duplicate) {
            $this->record(
                $databoy,
                $databoy->browsing_number,
                null,
                'failed',
                'Duplicate phone number — already used by ' . ($duplicate->databoy->full_name ?? 'another databoy') . '.'
            );
            return;
        }

        $categories = $easiGateway->getServiceCategories();

        if ($categories['status'] !== 'success' || empty($categories['data'])) {
            $this->record($databoy, $databoy->browsing_number, null, 'failed', 'Could not fetch service categories from EasiGateway.');
            return;
        }

        $match = collect($categories['data'])->first(
            fn ($category) => strtolower($category['name'] ?? '') === strtolower($databoy->browsing_network)
        );

        if (!$match) {
            $this->record($databoy, $databoy->browsing_number, null, 'failed', "No matching service category found for network '{$databoy->browsing_network}'.");
            return;
        }

        $this->record($databoy, $databoy->browsing_number, $match['_id'], 'success', null);
    }

    private function record(Databoy $databoy, ?string $phone, ?string $serviceCategoryId, string $status, ?string $message): void
    {
        AirtimeRecipient::updateOrCreate(
            ['databoy_id' => $databoy->id],
            [
                'phone_number'         => $phone ?? $databoy->browsing_number ?? '',
                'network'              => $databoy->browsing_network ?? '',
                'service_category_id'  => $serviceCategoryId,
                'status'               => $status,
                'message'              => $message,
            ]
        );
    }
}
