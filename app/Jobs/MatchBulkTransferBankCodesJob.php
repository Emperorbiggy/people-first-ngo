<?php

namespace App\Jobs;

use App\Models\BulkTransferBatch;
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
 * Matches every un-coded bank name in a batch to a Paystack bank code.
 *
 * One job for the whole batch rather than one per row: the bank list is fetched
 * once and the rest is pure string matching against it, so thousands of rows
 * cost a single API call. Doing it in the request timed out on large imports.
 */
class MatchBulkTransferBankCodesJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 600;
    public int $uniqueFor = 1800;

    public function __construct(public int $batchId)
    {
    }

    public function uniqueId(): string
    {
        return (string) $this->batchId;
    }

    public function handle(PaystackService $paystack): void
    {
        $log = fn (string $msg, array $ctx = []) => Log::info("[MatchBulkTransferBankCodesJob #{$this->batchId}] {$msg}", $ctx);

        $batch = BulkTransferBatch::find($this->batchId);

        if (!$batch) {
            return;
        }

        $matcher = new BankMatcher($paystack);

        if (!$matcher->hasBanks()) {
            $log('Aborted: could not fetch the bank list from Paystack.');
            return;
        }

        $matched   = 0;
        $unmatched = [];

        // Chunked so a 5000-row batch never loads whole into memory.
        $batch->recipients()->missingBankCode()->chunkById(500, function ($rows) use ($matcher, &$matched, &$unmatched) {
            foreach ($rows as $row) {
                $code = $matcher->codeFor($row->bank_name);

                if ($code) {
                    $row->update(['bank_code' => $code]);
                    $matched++;
                } else {
                    $unmatched[$row->bank_name] = ($unmatched[$row->bank_name] ?? 0) + 1;
                }
            }
        });

        $log('Finished.', [
            'matched'   => $matched,
            'unmatched' => $unmatched,
        ]);
    }
}
