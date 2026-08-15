<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class EasigatewayTransaction extends Model
{
    protected $fillable = [
        'type', 'amount', 'balance_after', 'description', 'reference_type', 'reference_id',
    ];

    protected $casts = [
        'amount'        => 'decimal:2',
        'balance_after' => 'decimal:2',
    ];

    public function reference()
    {
        return $this->morphTo();
    }

    public static function currentBalance(): float
    {
        return (float) (static::latest('id')->value('balance_after') ?? 0);
    }

    /** Whether the tracked balance covers a spend of this size. */
    public static function canAfford(float $amount): bool
    {
        return static::currentBalance() >= $amount;
    }

    public static function record(string $type, float $amount, string $description, $reference = null): self
    {
        $balance = static::currentBalance();
        $balanceAfter = $type === 'credit' ? $balance + $amount : $balance - $amount;

        return static::create([
            'type'          => $type,
            'amount'        => $amount,
            'balance_after' => $balanceAfter,
            'description'   => $description,
            'reference_type' => $reference ? get_class($reference) : null,
            'reference_id'   => $reference?->id,
        ]);
    }

    /**
     * Reserve money for a purchase before it is attempted.
     *
     * Locks the ledger, re-reads the balance inside the lock and refuses if it
     * will not cover the spend — so the balance can never go negative and two
     * jobs running back to back cannot both spend the same last naira. Returns
     * null when there isn't enough.
     *
     * MUST be called before the API request, not after: debiting only on
     * success means a purchase that succeeds while the balance is empty still
     * takes money that isn't there.
     */
    public static function debitIfAffordable(float $amount, string $description, $reference = null): ?self
    {
        return DB::transaction(function () use ($amount, $description, $reference) {
            // Lock the row the balance is read from, so a concurrent debit
            // waits rather than reading a stale figure.
            $latest = static::query()->lockForUpdate()->latest('id')->first();
            $balance = (float) ($latest->balance_after ?? 0);

            if ($balance < $amount) {
                return null;
            }

            return static::create([
                'type'           => 'debit',
                'amount'         => $amount,
                'balance_after'  => $balance - $amount,
                'description'    => $description,
                'reference_type' => $reference ? get_class($reference) : null,
                'reference_id'   => $reference?->id,
            ]);
        });
    }
}
