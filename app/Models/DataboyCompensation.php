<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataboyCompensation extends Model
{
    protected $fillable = [
        'uploaded_name', 'uploaded_lga', 'lga_id',
        'databoy_id', 'amount', 'status', 'approved_at', 'note',
    ];

    protected $casts = [
        'amount'      => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function lga()      { return $this->belongsTo(Lga::class); }
    public function databoy()  { return $this->belongsTo(Databoy::class); }
    public function payments() { return $this->hasMany(DataboyCompensationPayment::class); }

    /** One per row, not a limit(1) eager load — see BulkTransferRecipient. */
    public function latestPayment()
    {
        return $this->hasOne(DataboyCompensationPayment::class)->latestOfMany();
    }

    /** Holds this row's unique paid_key — not a definite failure. */
    public function hasLivePayment(): bool
    {
        return $this->payments()->whereNotNull('paid_key')->exists();
    }

    /**
     * Approved, matched to a databoy with a working transfer recipient, an
     * amount to send, and nothing paid yet.
     */
    public function scopeAwaitingPayment($query)
    {
        return $query->where('status', 'approved')
            ->whereNotNull('databoy_id')
            ->where('amount', '>', 0)
            ->whereDoesntHave('payments', fn ($q) => $q->whereNotNull('paid_key'));
    }
}
