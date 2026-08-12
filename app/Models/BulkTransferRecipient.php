<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BulkTransferRecipient extends Model
{
    protected $fillable = [
        'full_name', 'bank_name', 'bank_code', 'account_number', 'account_name',
        'recipient_code', 'recipient_status', 'recipient_message',
    ];

    public function payments() { return $this->hasMany(BulkTransferPayment::class, 'bulk_transfer_recipient_id'); }

    /** Holds this row's unique paid_key — not a definite failure. */
    public function hasLivePayment(): bool
    {
        return $this->payments()->whereNotNull('paid_key')->exists();
    }

    public function scopeNeedsRecipient($query)
    {
        return $query->where(fn ($q) => $q->whereNull('recipient_status')->orWhere('recipient_status', '!=', 'success'));
    }

    public function scopePayable($query)
    {
        return $query->where('recipient_status', 'success')
            ->whereNotNull('recipient_code')
            ->whereDoesntHave('payments', fn ($q) => $q->whereNotNull('paid_key'));
    }
}
