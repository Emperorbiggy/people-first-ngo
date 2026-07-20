<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartyAgentAirtimeRecipient extends Model
{
    protected $fillable = [
        'party_agent_id', 'phone_number', 'network', 'service_category_id', 'status', 'message',
    ];

    public function partyAgent()
    {
        return $this->belongsTo(PartyAgent::class);
    }
}
