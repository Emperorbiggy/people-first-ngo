<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class QueueMonitorController extends Controller
{
    public function index()
    {
        $pending = DB::table('jobs')
            ->orderBy('id')
            ->get()
            ->map(fn ($row) => [
                'id'           => $row->id,
                'queue'        => $row->queue,
                'job_class'    => $this->jobClassName($row->payload),
                'attempts'     => $row->attempts,
                'status'       => $row->reserved_at ? 'processing' : 'pending',
                'queued_at'    => Carbon::createFromTimestamp($row->created_at)->toIso8601String(),
                'available_at' => Carbon::createFromTimestamp($row->available_at)->toIso8601String(),
            ]);

        $failed = DB::table('failed_jobs')
            ->orderByDesc('failed_at')
            ->get()
            ->map(fn ($row) => [
                'uuid'       => $row->uuid,
                'queue'      => $row->queue,
                'job_class'  => $this->jobClassName($row->payload),
                'exception'  => $this->exceptionSummary($row->exception),
                'failed_at'  => Carbon::parse($row->failed_at)->toIso8601String(),
            ]);

        return inertia('Admin/QueueMonitor', [
            'stats' => [
                'pending'    => $pending->count(),
                'processing' => $pending->where('status', 'processing')->count(),
                'failed'     => $failed->count(),
            ],
            'pending' => $pending->values(),
            'failed'  => $failed->values(),
        ]);
    }

    public function retry(string $uuid)
    {
        Artisan::call('queue:retry', ['id' => [$uuid]]);

        return back()->with('success', 'Job re-queued for retry.');
    }

    public function retryAll()
    {
        Artisan::call('queue:retry', ['id' => ['all']]);

        return back()->with('success', 'All failed jobs re-queued for retry.');
    }

    public function forget(string $uuid)
    {
        Artisan::call('queue:forget', ['id' => $uuid]);

        return back()->with('success', 'Failed job removed.');
    }

    private function jobClassName(string $payload): string
    {
        $decoded = json_decode($payload, true);

        return $decoded['displayName'] ?? 'Unknown';
    }

    private function exceptionSummary(string $exception): string
    {
        $firstLine = strtok($exception, "\n") ?: $exception;

        return mb_strimwidth($firstLine, 0, 300, '…');
    }
}
