<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * An account for the transport panel — the vehicle register and the agents who
 * build it, and nothing else in the system.
 */
class TransportAdmin extends Authenticatable
{
    use Notifiable;

    protected $fillable = [
        'full_name', 'email', 'phone_number', 'password', 'is_active', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'is_active'     => 'boolean',
        'last_login_at' => 'datetime',
        'password'      => 'hashed',
    ];
}
