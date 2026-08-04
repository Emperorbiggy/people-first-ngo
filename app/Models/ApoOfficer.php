<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApoOfficer extends Model
{
    protected $fillable = ['databoy_application_id', 'qualified_by'];

    public function application()  { return $this->belongsTo(DataboyApplication::class, 'databoy_application_id'); }
    public function qualifiedBy()  { return $this->belongsTo(Databoy::class, 'qualified_by'); }
}
