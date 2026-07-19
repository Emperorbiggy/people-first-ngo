<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lga extends Model
{
    protected $fillable = ['state_id', 'name', 'head_quarter'];

    public function state() { return $this->belongsTo(State::class); }
    public function wards() { return $this->hasMany(Ward::class); }
    public function transportFare() { return $this->hasOne(LgaTransportFare::class); }
}
