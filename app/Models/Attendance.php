<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $table = 'attendance';

    protected $fillable = ['surname', 'firstname', 'othernames', 'lga', 'lga_id', 'phone_number', 'present', 'marked_present_at'];

    protected $casts = [
        'present'           => 'boolean',
        'marked_present_at' => 'datetime',
    ];

    protected $appends = ['full_name'];

    /** Surname first, the way the register is called. */
    public function getFullNameAttribute(): string
    {
        return trim("{$this->surname} {$this->firstname} {$this->othernames}");
    }

    public function lgaRecord() { return $this->belongsTo(Lga::class, 'lga_id'); }
}
