<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AirtimeRecipient extends Model
{
    protected $fillable = [
        'databoy_id', 'phone_number', 'network', 'service_category_id', 'status', 'message',
    ];

    public function databoy()
    {
        return $this->belongsTo(Databoy::class);
    }
}
