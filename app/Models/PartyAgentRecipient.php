<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartyAgentRecipient extends Model
{
    protected $fillable = [
        'party_agent_id', 'bank_name', 'bank_code', 'account_number', 'account_name',
        'recipient_code', 'status', 'message',
    ];

    public function partyAgent()
    {
        return $this->belongsTo(PartyAgent::class);
    }
}
