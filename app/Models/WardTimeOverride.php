<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WardTimeOverride extends Model
{
    protected $fillable = [
        'ward_id', 'override_date', 'checkin_start', 'checkin_end', 'checkout_start', 'checkout_end',
    ];

    protected $casts = ['override_date' => 'date'];

    public function ward()
    {
        return $this->belongsTo(Ward::class);
    }
}
