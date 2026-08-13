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
        'checked_in_at', 'checked_in_by',
    ];

    protected $casts = ['checked_in_at' => 'datetime'];

    protected $appends = ['full_name'];

    /**
     * Surname first, the way the roster is read. Collapses whitespace: first
     * and other name are both optional, so a missing one must not leave a
     * double space in the middle of the name.
     */
    public function getFullNameAttribute(): string
    {
        return trim(preg_replace('/\s+/', ' ', "{$this->final_surname} {$this->final_first_name} {$this->final_other_name}"));
    }

    public function payments()   { return $this->hasMany(PoPayment::class, 'po_officer_id'); }
    public function checkedInBy(){ return $this->belongsTo(Databoy::class, 'checked_in_by'); }

    /**
     * A check-in officer only ever sees their own LGA. final_lga is free text
     * (this roster has no geo foreign keys), so the comparison is done on a
     * normalised form — "Ede North", "EDE NORTH" and "ede-north" are one place.
     */
    public function scopeForLga($query, ?string $lgaName)
    {
        $needle = preg_replace('/[^a-z0-9]/', '', strtolower((string) $lgaName));

        if ($needle === '') {
            // No LGA on the login means no roster — never the whole state.
            return $query->whereRaw('1 = 0');
        }

        // Nested REPLACE rather than REGEXP_REPLACE: the latter needs MySQL 8+
        // and would fail outright on 5.7. This strips the punctuation that
        // actually varies in LGA names — spaces, hyphens, underscores, dots.
        return $query->whereRaw(
            "LOWER(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(final_lga, ''), ' ', ''), '-', ''), '_', ''), '.', '')) = ?",
            [$needle]
        );
    }

    public function scopeCheckedIn($query)  { return $query->whereNotNull('checked_in_at'); }
    public function scopeNotCheckedIn($query) { return $query->whereNull('checked_in_at'); }

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

    /**
     * Officers with no working transfer recipient yet — the only ones worth
     * queueing.
     *
     * "Has a recipient" means a recipient_code actually came back, not merely
     * that the status says success. A missing bank code is no longer a reason
     * to exclude anyone: the job matches the bank name itself, so filtering on
     * it here only hid officers who could have been resolved.
     */
    public function scopeReadyForRecipient($query)
    {
        return $query->where(fn ($q) => $q->whereNull('recipient_code')->orWhere('recipient_code', ''));
    }
}
