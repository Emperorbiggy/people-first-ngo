<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BulkTransferPayment extends Model
{
    protected $fillable = [
        'bulk_transfer_recipient_id', 'paid_key', 'amount',
        'bank_name', 'bank_code', 'account_number', 'account_name',
        'recipient_code', 'transfer_code', 'reference', 'status', 'message',
    ];

    protected $casts = ['amount' => 'decimal:2'];

    public function recipient() { return $this->belongsTo(BulkTransferRecipient::class, 'bulk_transfer_recipient_id'); }

    public function scopeLive($query)
    {
        return $query->whereNotNull('paid_key');
    }
}
