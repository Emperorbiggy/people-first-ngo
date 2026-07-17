<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Shared hosting has no persistent queue worker, so a cron-driven scheduler
// run (`php artisan schedule:run` every minute) drains whatever recipient
// creation / bulk transfer jobs are pending each minute instead.
Schedule::command('queue:work --stop-when-empty --tries=1')
    ->everyMinute()
    ->withoutOverlapping();
