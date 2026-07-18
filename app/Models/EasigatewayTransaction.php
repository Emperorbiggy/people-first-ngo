<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
}
