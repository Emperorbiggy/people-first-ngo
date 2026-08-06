<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApoPayment extends Model
{
    protected $fillable = [
        'apo_officer_id', 'databoy_application_id', 'paid_key', 'amount',
        'bank_name', 'bank_code', 'account_number', 'account_name',
        'recipient_code', 'transfer_code', 'reference', 'status', 'message',
    ];

    protected $casts = ['amount' => 'decimal:2'];

    /**
     * A payment that is not a definite failure — it holds the officer's
     * unique paid_key, so no second payment can ever be inserted for them.
     */
    public function scopeLive($query)
    {
        return $query->whereNotNull('paid_key');
    }

    public function officer()    { return $this->belongsTo(ApoOfficer::class, 'apo_officer_id'); }
    public function application(){ return $this->belongsTo(DataboyApplication::class, 'databoy_application_id'); }
}
