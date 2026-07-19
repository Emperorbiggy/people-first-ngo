<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LgaTransportFare extends Model
{
    protected $fillable = ['lga_id', 'amount'];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function lga()
    {
        return $this->belongsTo(Lga::class);
    }
}
