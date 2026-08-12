<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PoPayment extends Model
{
    protected $fillable = [
        'po_officer_id', 'paid_key', 'amount',
        'bank_name', 'bank_code', 'account_number', 'account_name',
        'recipient_code', 'transfer_code', 'reference', 'status', 'message',
    ];

    protected $casts = ['amount' => 'decimal:2'];

    public function officer() { return $this->belongsTo(PoOfficer::class, 'po_officer_id'); }

    /** Holds the officer's unique claim — not a definite failure. */
    public function scopeLive($query)
    {
        return $query->whereNotNull('paid_key');
    }
}
