<?php

namespace App\Jobs;

use App\Models\Databoy;
use App\Models\DataPlan;
use App\Models\DataPurchase;
use App\Models\EasigatewayTransaction;
use App\Services\EasiGatewayService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Buys one databoy's data bundle. Dispatched as a Bus::chain of many of
 * these (one per databoy) so EasiGateway calls happen strictly one after
 * another, never in a burst.
 *
 * Unlike airtime, data purchases don't need a separate "recipient" record —
 * the service category + bundle to use is already resolved per network via
 * the admin-configured DataPlan, so this job reads straight from there.
 */
class PurchaseDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 120;

    public function __construct(public int $databoyId)
    {
    }

    public function handle(EasiGatewayService $easiGateway): void
    {
        $databoy = Databoy::find($this->databoyId);

        if (!$databoy || !$databoy->browsing_network || !$databoy->browsing_number) {
            return;
        }

        // A databoy with any non-failed purchase has already received their
        // data bundle and must never be bought for again.
        $alreadyBought = DataPurchase::where('databoy_id', $databoy->id)
            ->where('status', '!=', 'failed')
            ->exists();

        if ($alreadyBought) {
            return;
        }

        $plan = DataPlan::where('network', $databoy->browsing_network)->first();

        if (!$plan) {
            DataPurchase::create([
                'databoy_id'           => $databoy->id,
                'phone_number'         => $databoy->browsing_number,
                'network'              => $databoy->browsing_network,
                'service_category_id'  => null,
                'bundle_code'          => null,
                'amount'               => 0,
                'status'               => 'failed',
                'message'              => "No data plan configured for {$databoy->browsing_network}. Set one in Data Plans.",
            ]);
            return;
        }

        // Skip if this phone number has already been successfully topped up
        // in a previous run — never buy data for the same number twice.
        $duplicatePhone = DataPurchase::where('phone_number', $databoy->browsing_number)
            ->where('status', 'success')
            ->exists();

        if ($duplicatePhone) {
            DataPurchase::create([
                'databoy_id'           => $databoy->id,
                'phone_number'         => $databoy->browsing_number,
                'network'              => $databoy->browsing_network,
                'service_category_id'  => $plan->service_category_id,
                'bundle_code'          => $plan->bundle_code,
                'amount'               => $plan->amount,
                'status'               => 'failed',
                'message'              => 'Duplicate phone number — already purchased.',
            ]);
            return;
        }

        // Pace calls so a burst of queued jobs doesn't fire EasiGateway
        // requests back-to-back with zero gap (EasiGateway runs on a
        // Render.com instance that can be slow to respond under load).
        usleep(1000000);

        $result = $easiGateway->purchaseData(
            $databoy->browsing_number,
            $plan->service_category_id,
            $plan->bundle_code,
            (int) $plan->amount
        );

        $purchase = DataPurchase::create([
            'databoy_id'           => $databoy->id,
            'phone_number'         => $databoy->browsing_number,
            'network'              => $databoy->browsing_network,
            'service_category_id'  => $plan->service_category_id,
            'bundle_code'          => $plan->bundle_code,
            'amount'               => $plan->amount,
            'status'               => $result['status'] === 'success' ? 'success' : 'failed',
            'message'              => $result['status'] === 'success' ? null : ($result['message'] ?? 'Data purchase failed.'),
        ]);

        if ($purchase->status === 'success') {
            EasigatewayTransaction::record(
                'debit',
                (float) $plan->amount,
                "Data purchase for {$databoy->browsing_number} ({$databoy->browsing_network})",
                $purchase
            );
        }
    }
}
