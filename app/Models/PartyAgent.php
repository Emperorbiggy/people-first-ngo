<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartyAgent extends Model
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
        'passport_photograph_path',
    ];

    protected $casts = [
        'has_voter_card' => 'boolean',
        'age'            => 'integer',
    ];

    public function databoy()     { return $this->belongsTo(Databoy::class, 'registered_by'); }
    public function lga()         { return $this->belongsTo(Lga::class); }
    public function ward()        { return $this->belongsTo(Ward::class); }
    public function pollingUnit() { return $this->belongsTo(PollingUnit::class); }
    public function recipient()   { return $this->hasOne(PartyAgentRecipient::class); }
    public function payments()    { return $this->hasMany(PartyAgentPayment::class); }

    public function airtimeRecipient()  { return $this->hasOne(PartyAgentAirtimeRecipient::class); }
    public function airtimePurchases()  { return $this->hasMany(PartyAgentAirtimePurchase::class); }
    public function dataPurchases()     { return $this->hasMany(PartyAgentDataPurchase::class); }
}
