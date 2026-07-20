<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

trait RequiresPasscode
{
    protected function passcodeValid(Request $request): bool
    {
        $expected = (string) config('services.passcode');
        $given    = (string) $request->input('passcode');

        return $expected !== '' && hash_equals($expected, $given);
    }
}
