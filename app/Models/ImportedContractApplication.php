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
        'country_id',
        'lga_id',
        'ward_id',
        'polling_unit_id',
    ];

    protected $casts = [
        'has_voter_card' => 'boolean',
    ];

    public function country()     { return $this->belongsTo(Country::class); }
    public function lgaRecord()   { return $this->belongsTo(Lga::class, 'lga_id'); }
    public function wardRecord()  { return $this->belongsTo(Ward::class, 'ward_id'); }
    public function pollingUnit() { return $this->belongsTo(PollingUnit::class); }
}
