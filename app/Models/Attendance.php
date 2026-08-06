<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $table = 'attendance';

    protected $fillable = ['name', 'lga', 'lga_id', 'phone_number', 'whatsapp_number', 'present', 'marked_present_at'];

    protected $casts = [
        'present'           => 'boolean',
        'marked_present_at' => 'datetime',
    ];

    public function lgaRecord() { return $this->belongsTo(Lga::class, 'lga_id'); }
}
