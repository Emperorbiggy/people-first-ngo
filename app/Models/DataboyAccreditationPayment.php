<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataboyAccreditationPayment extends Model
{
    protected $fillable = [
        'databoy_id', 'payment_date', 'amount', 'bank_name', 'bank_code', 'account_number', 'account_name',
        'recipient_code', 'transfer_code', 'reference', 'status', 'message',
    ];

    protected $casts = [
        'payment_date' => 'date',
    ];

    public function databoy()
    {
        return $this->belongsTo(Databoy::class);
    }
}
