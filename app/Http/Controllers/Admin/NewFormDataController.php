<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NewFormData;

class NewFormDataController extends Controller
{
    public function index()
    {
        $entries = NewFormData::with(['lga:id,name', 'ward:id,name'])
            ->latest()
            ->get(['id', 'full_name', 'phone_number', 'lga_id', 'ward_id', 'passport_photograph_path', 'created_at']);

        return inertia('Admin/NewFormData', compact('entries'));
    }
}
