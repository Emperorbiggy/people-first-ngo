<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataboyRecipient extends Model
{
    protected $fillable = [
        'databoy_id', 'bank_name', 'bank_code', 'account_number', 'account_name',
        'recipient_code', 'status', 'message',
    ];

    public function databoy()
    {
        return $this->belongsTo(Databoy::class);
    }
}
