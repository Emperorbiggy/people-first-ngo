<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EasigatewayFunding extends Model
{
    protected $fillable = [
        'reference', 'amount', 'fee_amount', 'total_amount', 'customer_name', 'customer_email',
        'bank_name', 'account_number', 'account_name',
        'status', 'verified_at', 'expires_at', 'raw_response', 'created_by',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'fee_amount'   => 'decimal:2',
        'total_amount' => 'decimal:2',
        'verified_at'  => 'datetime',
        'expires_at'   => 'datetime',
        'raw_response' => 'array',
    ];

    public function createdBy() { return $this->belongsTo(User::class, 'created_by'); }
}
