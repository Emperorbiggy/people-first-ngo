<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Models\DataboyApplication;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function index()
    {
        $databoy = Auth::guard('databoy')->user();
        $total   = DataboyApplication::where('registered_by', $databoy->id)->count();
        $recent  = DataboyApplication::where('registered_by', $databoy->id)
            ->latest()
            ->take(5)
            ->get(['id', 'full_name', 'state_of_residence', 'created_at']);

        return inertia('Databoy/Dashboard', [
            'total'  => $total,
            'recent' => $recent,
        ]);
    }
}
