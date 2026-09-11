<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;

/**
 * An agent who registers transportation vehicles and their owners.
 *
 * Authenticatable in its own right, on its own guard — they log in with the
 * phone number they registered with.
 */
class TransportAgent extends Authenticatable
{
    use Notifiable;

    /** The government IDs accepted at registration. */
    public const ID_TYPES = [
        'nin'                   => 'NIN (National Identity Number)',
        'drivers_licence'       => "Driver's Licence",
        'voters_card'           => "Voter's Card",
        'international_passport' => 'International Passport',
    ];

    protected $fillable = [
        'full_name', 'phone_number', 'whatsapp_number', 'email', 'gender', 'address',
        'passport_photograph_path', 'id_type', 'id_number', 'id_document_path',
        'lga_id', 'lga_name',
        'bank_name', 'bank_code', 'account_number', 'bank_account_name',
        'login_password_plain', 'password', 'is_active', 'role', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token', 'login_password_plain'];

    protected $casts = [
        'is_active'     => 'boolean',
        'last_login_at' => 'datetime',
    ];

    protected $appends = ['id_type_label', 'passport_photograph_url', 'id_document_url'];

    public function getIdTypeLabelAttribute(): ?string
    {
        return $this->id_type ? (self::ID_TYPES[$this->id_type] ?? $this->id_type) : null;
    }

    public function getPassportPhotographUrlAttribute(): ?string
    {
        return $this->fileUrl($this->passport_photograph_path);
    }

    public function getIdDocumentUrlAttribute(): ?string
    {
        return $this->fileUrl($this->id_document_path);
    }

    private function fileUrl(?string $path): ?string
    {
        return $path ? Storage::disk('public')->url($path) : null;
    }

    /** They sign in with their phone number, not an email. */
    public function getAuthIdentifierName(): string
    {
        return 'phone_number';
    }

    public function lga() { return $this->belongsTo(Lga::class); }
}
