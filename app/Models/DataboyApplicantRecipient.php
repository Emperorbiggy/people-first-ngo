<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataboyApplicantRecipient extends Model
{
    protected $fillable = [
        'databoy_application_id', 'bank_name', 'bank_code', 'account_number', 'account_name',
        'recipient_code', 'status', 'message',
    ];

    public function application()
    {
        return $this->belongsTo(DataboyApplication::class, 'databoy_application_id');
    }
}
