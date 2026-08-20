<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApoFinalPayment extends Model
{
    protected $table = 'apo_final_payments';

    protected $fillable = [
        'bank_name', 'bank_code', 'account_number', 'account_name', 'amount',
        'recipient_code', 'recipient_status', 'recipient_message',
        'paid_key', 'transfer_code', 'reference', 'payment_status', 'payment_message', 'paid_at',
    ];

    protected $casts = [
        'amount'  => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    /** Holds the row's unique claim — a live payment, not a definite failure. */
    public function isPaid(): bool
    {
        return $this->paid_key !== null;
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

    /** A recipient to send to, an amount to send, and nothing paid yet. */
    public function scopePayable($query)
    {
        return $query->whereNotNull('recipient_code')
            ->where('recipient_code', '!=', '')
            ->where('amount', '>', 0)
            ->whereNull('paid_key');
    }
}
