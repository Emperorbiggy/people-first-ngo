<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index()
    {
        return inertia('Admin/Settings', [
            'registrationOpen'  => Setting::get('databoy_registration_open', '1') === '1',
            'accessEnabled'     => Setting::get('databoy_access_enabled', '1') === '1',
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'key'   => 'required|in:databoy_registration_open,databoy_access_enabled',
            'value' => 'required|boolean',
        ]);

        Setting::set($request->key, $request->boolean('value') ? '1' : '0');

        return back()->with('success', 'Setting updated.');
    }
}
