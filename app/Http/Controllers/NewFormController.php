<?php

namespace App\Http\Controllers;

use App\Models\Lga;
use App\Models\NewFormData;
use App\Models\Ward;
use Illuminate\Http\Request;

class NewFormController extends Controller
{
    public function create()
    {
        return inertia('PublicForm/Create', [
            'lgas' => Lga::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function getWards(Lga $lga)
    {
        $takenIds = NewFormData::whereNotNull('ward_id')->pluck('ward_id');

        return response()->json(
            Ward::where('lga_id', $lga->id)
                ->whereNotIn('id', $takenIds)
                ->orderBy('name')
                ->get(['id', 'name'])
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name'            => 'required|string|max:255',
            'phone_number'         => 'required|string|max:20',
            'lga_id'               => 'required|exists:lgas,id',
            'ward_id'              => 'required|exists:wards,id|unique:new_form_data,ward_id',
            'passport_photograph'  => 'required|extensions:jpg,jpeg,png|max:2048',
        ], [
            'ward_id.unique' => 'This ward has already been registered by someone else.',
        ]);

        $cleanName = strtolower(preg_replace('/\s+/', ' ', trim($validated['full_name'])));
        $rand      = rand(1000, 9999);
        $filename  = "{$cleanName} {$rand} passport." . $request->file('passport_photograph')->getClientOriginalExtension();
        $path      = $request->file('passport_photograph')->storeAs('new-form-data', $filename, 'public');

        NewFormData::create([
            'full_name'                => $validated['full_name'],
            'phone_number'             => $validated['phone_number'],
            'lga_id'                   => $validated['lga_id'],
            'ward_id'                  => $validated['ward_id'],
            'passport_photograph_path' => $path,
        ]);

        return redirect()->route('new-form.success');
    }

    public function success()
    {
        return inertia('PublicForm/Success');
    }
}
