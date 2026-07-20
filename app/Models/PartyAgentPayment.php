<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartyAgentPayment extends Model
{
    protected $fillable = [
        'party_agent_id', 'amount', 'bank_name', 'bank_code', 'account_number', 'account_name',
        'recipient_code', 'transfer_code', 'reference', 'status', 'message',
    ];

    public function partyAgent()
    {
        return $this->belongsTo(PartyAgent::class);
    }
}
