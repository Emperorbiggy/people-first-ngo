<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Databoy extends Authenticatable
{
    use Notifiable;

    protected $fillable = [
        'full_name', 'gender', 'age',
        'working_email', 'calling_phone_number', 'whatsapp_number',
        'state_of_residence', 'state_id', 'lga_id', 'ward_id',
        'house_address', 'browsing_network', 'browsing_number',
        'bank_name', 'bank_code', 'account_number', 'bank_account_name',
        'employment_status', 'availability',
        'passport_photograph_path', 'valid_id_card_path', 'highest_qualification_certificate_path',
        'login_email', 'login_password_plain', 'password', 'is_active',
    ];

    protected $hidden = ['password', 'remember_token', 'login_password_plain'];

    protected $casts = ['age' => 'integer', 'is_active' => 'boolean'];

    public function getAuthIdentifierName(): string { return 'login_email'; }

    public function state()   { return $this->belongsTo(State::class); }
    public function lga()     { return $this->belongsTo(Lga::class); }
    public function ward()    { return $this->belongsTo(Ward::class); }
    public function applications() { return $this->hasMany(DataboyApplication::class, 'registered_by'); }
    public function payments()     { return $this->hasMany(DataboyPayment::class); }
    public function airtimeRecipient()  { return $this->hasOne(AirtimeRecipient::class); }
    public function airtimePurchases()  { return $this->hasMany(AirtimePurchase::class); }
    public function dataPurchases()     { return $this->hasMany(DataPurchase::class); }
}
