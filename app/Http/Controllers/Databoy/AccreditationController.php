<?php

namespace App\Http\Controllers\Databoy;

use App\Http\Controllers\Controller;
use App\Models\DataboyApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class AccreditationController extends Controller
{
    public function index()
    {
        $databoy = Auth::guard('databoy')->user();

        $applications = DataboyApplication::where('registered_by', $databoy->id)
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'calling_phone_number', 'passport_photograph_path', 'is_accredited', 'accredited_at']);

        return inertia('Databoy/Accreditation', compact('applications'));
    }

    public function accredit(Request $request, DataboyApplication $databoyApplication)
    {
        $databoy = Auth::guard('databoy')->user();

        abort_if($databoyApplication->registered_by !== $databoy->id, 403);

        $request->validate([
            'photo' => 'required|image|max:5120',
        ]);

        $oldPath = $databoyApplication->passport_photograph_path;

        $cleanName = strtolower(preg_replace('/\s+/', ' ', trim($databoyApplication->full_name)));
        $rand      = rand(1000, 9999);
        $filename  = "{$cleanName} {$rand} accreditation." . $request->file('photo')->getClientOriginalExtension();
        $newPath   = $request->file('photo')->storeAs('databoy-applications', $filename, 'public');

        $databoyApplication->update([
            'passport_photograph_path' => $newPath,
            'is_accredited'            => true,
            'accredited_at'            => now(),
            'accredited_by'            => null,
            'accredited_by_databoy_id' => $databoy->id,
        ]);

        if ($oldPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        return back()->with('success', "{$databoyApplication->full_name} has been accredited.");
    }
}
