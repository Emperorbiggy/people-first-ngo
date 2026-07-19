<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataPlan extends Model
{
    protected $fillable = [
        'network', 'service_category_id', 'bundle_code', 'amount', 'validity',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];
}
