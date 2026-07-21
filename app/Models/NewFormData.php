<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewFormData extends Model
{
    protected $table = 'new_form_data';

    protected $fillable = [
        'full_name', 'phone_number', 'lga_id', 'ward_id', 'passport_photograph_path',
    ];

    public function lga()  { return $this->belongsTo(Lga::class); }
    public function ward() { return $this->belongsTo(Ward::class); }
}
