<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EForm extends Model
{
    protected $table = 'e_forms';

    protected $fillable = [
        'application_id', 'full_name', 'phone_number',
        'lga_id', 'lga_of_training', 'gender',
        'account_number', 'bank_name', 'bank_code',
    ];

    public function lga() { return $this->belongsTo(Lga::class); }
}
