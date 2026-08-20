<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataboyCompensationPayment extends Model
{
    /** Explicit for the same reason as DataboyCompensation — see that model. */
    protected $table = 'databoy_compensation_payments';

    protected $fillable = [
        'databoy_compensation_id', 'databoy_id', 'paid_key', 'amount',
        'bank_name', 'bank_code', 'account_number', 'account_name',
        'recipient_code', 'transfer_code', 'reference', 'status', 'message',
    ];

    protected $casts = ['amount' => 'decimal:2'];

    public function compensation() { return $this->belongsTo(DataboyCompensation::class, 'databoy_compensation_id'); }
    public function databoy()      { return $this->belongsTo(Databoy::class); }
}
