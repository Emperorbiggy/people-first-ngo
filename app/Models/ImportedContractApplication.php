<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportedContractApplication extends Model
{
    protected $fillable = [
        'full_name',
        'phone_number',
        'whatsapp_number',
        'highest_qualification',
        'ward',
        'unit',
        'has_voter_card',
        'lga',
    ];

    protected $casts = [
        'has_voter_card' => 'boolean',
    ];
}
