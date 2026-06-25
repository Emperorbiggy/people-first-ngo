<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class State extends Model
{
    protected $fillable = ['country_id', 'name', 'capital'];

    public function country() { return $this->belongsTo(Country::class); }
    public function lgas()    { return $this->hasMany(Lga::class); }
}
