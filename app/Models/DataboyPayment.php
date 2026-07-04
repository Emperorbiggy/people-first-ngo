<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataboyPayment extends Model
{
    protected $fillable = [
        'databoy_id', 'amount', 'bank_name', 'bank_code', 'account_number', 'account_name',
        'recipient_code', 'transfer_code', 'reference', 'status', 'message',
    ];

    public function databoy()
    {
        return $this->belongsTo(Databoy::class);
    }
}
