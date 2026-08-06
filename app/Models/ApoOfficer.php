<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApoOfficer extends Model
{
    protected $fillable = [
        'databoy_application_id', 'qualified_by', 'previous_full_name', 'replaced_at',
        'is_suitable', 'check_in_photo_path', 'checked_in_at',
        'check_out_photo_path', 'checked_out_at',
        'is_accredited', 'accredited_at', 'accredited_by_databoy_id',
    ];

    protected $casts = [
        'replaced_at'    => 'datetime',
        'is_suitable'    => 'boolean',
        'checked_in_at'  => 'datetime',
        'checked_out_at' => 'datetime',
        'is_accredited'  => 'boolean',
        'accredited_at'  => 'datetime',
    ];

    public function application()  { return $this->belongsTo(DataboyApplication::class, 'databoy_application_id'); }
    public function qualifiedBy()  { return $this->belongsTo(Databoy::class, 'qualified_by'); }
    public function accreditedBy() { return $this->belongsTo(Databoy::class, 'accredited_by_databoy_id'); }
    public function payments()     { return $this->hasMany(ApoPayment::class, 'apo_officer_id'); }

    /**
     * True once a payment exists that isn't a definite failure — the same
     * condition the database enforces via apo_payments.paid_key.
     */
    public function hasLivePayment(): bool
    {
        return $this->payments()->whereNotNull('paid_key')->exists();
    }
}
