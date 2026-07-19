<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataboyApplication extends Model
{
    protected $fillable = [
        'registered_by',
        'full_name', 'gender', 'age',
        'email_address', 'calling_phone_number', 'whatsapp_number',
        'state_of_residence', 'lga_id', 'ward_id', 'polling_unit_id',
        'house_address', 'browsing_network', 'browsing_number',
        'bank_name', 'bank_code', 'account_number', 'bank_account_name',
        'employment_status', 'availability',
        'current_occupation', 'work_grade_level',
        'has_voter_card',
        'passport_photograph_path', 'valid_id_card_path', 'highest_qualification_certificate_path',
        'is_accredited', 'accredited_at', 'accredited_by', 'accredited_by_databoy_id',
        'is_suitable', 'check_in_photo_path', 'checked_in_at', 'check_out_photo_path', 'checked_out_at',
    ];

    protected $casts = [
        'has_voter_card' => 'boolean',
        'age'            => 'integer',
        'is_accredited'  => 'boolean',
        'is_suitable'    => 'boolean',
        'accredited_at'  => 'datetime',
        'checked_in_at'  => 'datetime',
        'checked_out_at' => 'datetime',
    ];

    public function databoy()     { return $this->belongsTo(Databoy::class, 'registered_by'); }
    public function lga()         { return $this->belongsTo(Lga::class); }
    public function ward()        { return $this->belongsTo(Ward::class); }
    public function pollingUnit() { return $this->belongsTo(PollingUnit::class); }
    public function accreditedBy() { return $this->belongsTo(User::class, 'accredited_by'); }
    public function accreditedByDataboy() { return $this->belongsTo(Databoy::class, 'accredited_by_databoy_id'); }
    public function recipient()   { return $this->hasOne(DataboyApplicantRecipient::class, 'databoy_application_id'); }
    public function payments()    { return $this->hasMany(ApplicantPayment::class, 'databoy_application_id'); }
    public function accreditationPayments() { return $this->hasMany(AccreditationPayment::class, 'databoy_application_id'); }
}
