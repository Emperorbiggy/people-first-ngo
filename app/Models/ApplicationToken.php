<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApplicationToken extends Model
{
    protected $fillable = [
        'token',
        'imported_application_id',
        'ip_address',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function importedApplication()
    {
        return $this->belongsTo(ImportedContractApplication::class);
    }
}
