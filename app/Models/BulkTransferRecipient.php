<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BulkTransferRecipient extends Model
{
    protected $fillable = [
        'batch_id', 'full_name', 'gender', 'bank_name', 'bank_code',
        'account_number', 'account_name', 'duty_post', 'source_identity',
        'amount', 'remark',
        'recipient_code', 'recipient_status', 'recipient_message',
    ];

    protected $casts = ['amount' => 'decimal:2'];

    public function batch()    { return $this->belongsTo(BulkTransferBatch::class, 'batch_id'); }
    public function payments() { return $this->hasMany(BulkTransferPayment::class, 'bulk_transfer_recipient_id'); }

    /** Holds this row's unique paid_key — not a definite failure. */
    public function hasLivePayment(): bool
    {
        return $this->payments()->whereNotNull('paid_key')->exists();
    }

    public function scopeMissingBankCode($query)
    {
        return $query->where(fn ($q) => $q->whereNull('bank_code')->orWhere('bank_code', ''));
    }

    /** No working recipient yet — a recipient_code is what counts, not status. */
    public function scopeNeedsRecipient($query)
    {
        return $query->where(fn ($q) => $q->whereNull('recipient_code')->orWhere('recipient_code', ''));
    }

    /**
     * Ready to be paid: a recipient to send to, an amount to send, and no
     * payment already on record.
     */
    public function scopePayable($query)
    {
        return $query->whereNotNull('recipient_code')
            ->where('recipient_code', '!=', '')
            ->where('amount', '>', 0)
            ->whereDoesntHave('payments', fn ($q) => $q->whereNotNull('paid_key'));
    }
}
