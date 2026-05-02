<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NgoContractApplication extends Model
{
    protected $fillable = [
        'full_name',
        'gender',
        'age',
        'email_address',
        'calling_phone_number',
        'whatsapp_number',
        'state_of_residence',
        'house_address',
        'browsing_network',
        'browsing_number',
        'bank_name',
        'bank_code',
        'account_number',
        'bank_account_name',
        'employment_status',
        'availability',
        'current_occupation',
        'work_grade_level',
        'passport_photograph_path',
        'valid_id_card_path',
        'highest_qualification_certificate_path'
    ];
}
