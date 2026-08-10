<?php

namespace App\Jobs;

use App\Models\AirtimePurchase;
use App\Models\EasigatewayTransaction;
use App\Services\EasiGatewayService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Buys airtime for a phone number that came from an imported list rather than
 * from a databoy or party agent. Recorded in airtime_purchases with a null
 * databoy_id, so imported top-ups sit in the same history as every other one.
 */
class PurchaseImportedAirtimeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 90;

    public function __construct(
        public string $phoneNumber,
        public string $network,
        public float $amount
    ) {
    }

    public function handle(EasiGatewayService $easiGateway): void
    {
        // Already bought for this number? Don't top it up twice.
        $existing = AirtimePurchase::where('phone_number', $this->phoneNumber)
            ->where('status', '!=', 'failed')
            ->exists();

        if ($existing) {
            $this->record(null, 'failed', 'Skipped — this number already has an airtime purchase on record.');
            return;
        }

        $categories = $easiGateway->getServiceCategories();

        if (($categories['status'] ?? null) !== 'success' || empty($categories['data'])) {
            $this->record(null, 'failed', 'Could not fetch service categories from EasiGateway.');
            return;
        }

        $match = collect($categories['data'])->first(
            fn ($category) => strtolower($category['name'] ?? '') === strtolower($this->network)
        );

        if (!$match) {
            $this->record(null, 'failed', "No matching service category found for network '{$this->network}'.");
            return;
        }

        $result   = $easiGateway->purchase($this->phoneNumber, $match['_id'], (int) $this->amount);
        $success  = ($result['status'] ?? null) === 'success';

        $purchase = $this->record(
            $match['_id'],
            $success ? 'success' : 'failed',
            $success ? null : ($result['message'] ?? 'Airtime purchase failed.')
        );

        if ($success) {
            EasigatewayTransaction::record(
                'debit',
                $this->amount,
                "Airtime purchase for {$this->phoneNumber} ({$this->network}) — imported contact",
                $purchase
            );
        }
    }

    private function record(?string $serviceCategoryId, string $status, ?string $message): AirtimePurchase
    {
        return AirtimePurchase::create([
            'databoy_id'          => null,
            'phone_number'        => $this->phoneNumber,
            'network'             => $this->network,
            'service_category_id' => $serviceCategoryId,
            'amount'              => $this->amount,
            'status'              => $status,
            'message'             => $message,
        ]);
    }
}
