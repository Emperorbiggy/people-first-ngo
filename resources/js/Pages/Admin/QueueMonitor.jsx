import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

function StatCard({ label, value, color }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}

function relativeTime(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffSec = Math.round(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function QueueMonitor({ stats = {}, pending = [], failed = [] }) {
    const { flash } = usePage().props;
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [retryingAll, setRetryingAll] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            setRefreshing(true);
            router.reload({
                only: ['stats', 'pending', 'failed'],
                onFinish: () => {
                    setRefreshing(false);
                    setLastRefreshed(new Date());
                },
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const retry = (uuid) => {
        setBusyId(uuid);
        router.post(route('admin.queue-monitor.retry', uuid), {}, {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    };

    const forget = (uuid) => {
        setBusyId(uuid);
        router.post(route('admin.queue-monitor.forget', uuid), {}, {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    };

    const retryAll = () => {
        setRetryingAll(true);
        router.post(route('admin.queue-monitor.retry-all'), {}, {
            preserveScroll: true,
            onFinish: () => setRetryingAll(false),
        });
    };

    return (
        <AdminLayout title="Job Queue">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Job Queue</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Live view of queued and failed background jobs (recipient creation, bulk transfers).</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-500 whitespace-nowrap">
                        <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        Auto-refresh every 5s
                        {autoRefresh && (
                            <span className={refreshing ? 'text-indigo-500 font-medium' : 'text-gray-400'}>
                                · {refreshing ? 'refreshing…' : `last checked ${lastRefreshed.toLocaleTimeString()}`}
                            </span>
                        )}
                    </label>
                </div>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                        {flash.success}
                    </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                    <StatCard label="Pending" value={stats.pending ?? 0} color="text-amber-600" />
                    <StatCard label="Processing" value={stats.processing ?? 0} color="text-blue-600" />
                    <StatCard label="Failed" value={stats.failed ?? 0} color="text-red-600" />
                </div>

                {stats.failed === 0 && (pending || []).length === 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-sm text-emerald-800">
                        The queue is empty — nothing pending, nothing failed.
                    </div>
                )}

                <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                    On this server, jobs only run when the scheduler fires (every minute via cron, or continuously if a <code className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">queue:listen</code> process is running locally). Pending jobs may sit here briefly between scheduler runs — that's expected.
                </p>

                {/* Pending */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800">Pending / Processing Jobs</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{pending.length} job{pending.length !== 1 ? 's' : ''} in the queue</p>
                    </div>

                    {pending.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No jobs waiting.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Job', 'Queue', 'Attempts', 'Status', 'Queued'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {pending.map((job) => (
                                        <tr key={job.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{job.job_class.split('\\').pop()}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{job.queue}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{job.attempts}</td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${
                                                    job.status === 'processing' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                                                }`}>
                                                    {job.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{relativeTime(job.queued_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Failed */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-800">Failed Jobs</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{failed.length} job{failed.length !== 1 ? 's' : ''} failed</p>
                        </div>
                        {failed.length > 0 && (
                            <button
                                type="button"
                                onClick={retryAll}
                                disabled={retryingAll}
                                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition"
                            >
                                {retryingAll ? 'Retrying…' : 'Retry All'}
                            </button>
                        )}
                    </div>

                    {failed.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No failed jobs.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Job', 'Queue', 'Error', 'Failed', 'Actions'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {failed.map((job) => (
                                        <tr key={job.uuid} className="hover:bg-red-50/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{job.job_class.split('\\').pop()}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{job.queue}</td>
                                            <td className="px-5 py-3 text-xs text-red-600 max-w-sm truncate" title={job.exception}>{job.exception}</td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{relativeTime(job.failed_at)}</td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => retry(job.uuid)}
                                                        disabled={busyId === job.uuid}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition"
                                                    >
                                                        Retry
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => forget(job.uuid)}
                                                        disabled={busyId === job.uuid}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </AdminLayout>
    );
}
