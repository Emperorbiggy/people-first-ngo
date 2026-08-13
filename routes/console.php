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
/*
 * --max-time=55 makes the worker exit cleanly before the next minute's run.
 * Without it a long queue (1500+ recipient jobs) keeps one worker alive until
 * the host kills it mid-job, which leaves that job reserved and — worse —
 * leaves withoutOverlapping()'s lock held.
 *
 * withoutOverlapping() defaults to a 24-hour lock expiry. A killed worker never
 * releases it, so the scheduler silently refuses to start another worker for
 * the rest of the day and the queue just sits there. Five minutes is long
 * enough to prevent genuine overlap and short enough to self-heal.
 */
Schedule::command('queue:work --stop-when-empty --tries=1 --max-time=55')
    ->everyMinute()
    ->withoutOverlapping(5);
