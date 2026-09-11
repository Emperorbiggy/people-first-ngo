<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * An agent who registers transportation vehicles and their owners.
 *
 * Authenticatable in its own right, on its own guard — they log in with the
 * phone number they registered with.
 */
class TransportAgent extends Authenticatable
{
    use Notifiable;

    protected $fillable = [
        'full_name', 'phone_number', 'whatsapp_number', 'email', 'gender', 'address',
        'lga_id', 'lga_name',
        'bank_name', 'bank_code', 'account_number', 'bank_account_name',
        'login_password_plain', 'password', 'is_active', 'role', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token', 'login_password_plain'];

    protected $casts = [
        'is_active'     => 'boolean',
        'last_login_at' => 'datetime',
    ];

    /** They sign in with their phone number, not an email. */
    public function getAuthIdentifierName(): string
    {
        return 'phone_number';
    }

    public function lga() { return $this->belongsTo(Lga::class); }
}
