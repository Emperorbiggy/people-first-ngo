<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PollingUnit extends Model
{
    protected $fillable = ['ward_id', 'name'];

    public function ward() { return $this->belongsTo(Ward::class); }
}
