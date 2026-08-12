<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PoOfficer extends Model
{
    protected $fillable = [
        'final_surname', 'final_first_name', 'final_other_name', 'phone_number',
        'bank_name', 'bank_code', 'account_number', 'account_name',
        'final_lga', 'final_pu', 'final_ra_ward', 'final_role',
        'recipient_code', 'recipient_status', 'recipient_message',
    ];

    protected $appends = ['full_name'];

    /** Surname first, the way the roster is read. */
    public function getFullNameAttribute(): string
    {
        return trim("{$this->final_surname} {$this->final_first_name} {$this->final_other_name}");
    }

    public function payments() { return $this->hasMany(PoPayment::class, 'po_officer_id'); }

    /**
     * A payment that is not a definite failure — it holds this officer's
     * unique paid_key, so no second payment can be inserted for them.
     */
    public function hasLivePayment(): bool
    {
        return $this->payments()->whereNotNull('paid_key')->exists();
    }

    public function scopeMissingBankCode($query)
    {
        return $query->where(fn ($q) => $q->whereNull('bank_code')->orWhere('bank_code', ''));
    }

    public function scopeReadyForRecipient($query)
    {
        return $query->whereNotNull('bank_code')
            ->where('bank_code', '!=', '')
            ->where(fn ($q) => $q->whereNull('recipient_status')->orWhere('recipient_status', '!=', 'success'));
    }

    public function scopePayable($query)
    {
        return $query->where('recipient_status', 'success')
            ->whereNotNull('recipient_code')
            ->whereDoesntHave('payments', fn ($q) => $q->whereNotNull('paid_key'));
    }
}
