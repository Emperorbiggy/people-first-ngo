import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

function StatCard({ label, value, color }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}

const STATUS_STYLES = {
    success: 'bg-green-50 border-green-200 text-green-700',
    pending: 'bg-amber-50 border-amber-200 text-amber-700',
    otp: 'bg-amber-50 border-amber-200 text-amber-700',
    failed: 'bg-red-50 border-red-200 text-red-700',
};

function StatusBadge({ status }) {
    const style = STATUS_STYLES[status] ?? 'bg-gray-50 border-gray-200 text-gray-600';
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${style}`}>
            {status}
        </span>
    );
}

function formatNaira(value) {
    const n = Number(value);
    if (!n) return '₦0';
    return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DataboyPaymentAnalytics({ stats = {}, databoys = [] }) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    const filtered = useMemo(() => {
        return databoys.filter((d) => {
            const matchesSearch = search.trim()
                ? d.full_name?.toLowerCase().includes(search.trim().toLowerCase())
                : true;
            const matchesFilter =
                filter === 'all' ? true :
                filter === 'retried' ? d.attempts > 1 :
                d.latest_status === filter;
            return matchesSearch && matchesFilter;
        });
    }, [databoys, search, filter]);

    const allPaid = (stats.total_databoys ?? 0) > 0 && (stats.total_failed ?? 0) === 0;

    return (
        <AdminLayout title="Payment Analytics">
            <div className="max-w-7xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Databoy Payment Analytics</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Reconcile every payment attempt against who has actually been paid.</p>
                </div>

                {stats.total_databoys > 0 && (
                    allPaid ? (
                        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 text-sm text-green-800 font-medium">
                            All {stats.total_databoys} databoys who have been paid or attempted are currently marked as paid — nothing outstanding.
                        </div>
                    ) : (
                        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-800 font-medium flex items-center justify-between gap-3 flex-wrap">
                            <span>{stats.total_failed} databoy{stats.total_failed !== 1 ? 's' : ''} still {stats.total_failed !== 1 ? 'have' : 'has'} not been successfully paid.</span>
                            <Link href={route('admin.databoy-payments')} className="font-semibold underline whitespace-nowrap">
                                Go retry them
                            </Link>
                        </div>
                    )
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard label="Databoys Attempted" value={stats.total_databoys ?? 0} color="text-gray-800" />
                    <StatCard label="Total Attempts" value={stats.total_attempts ?? 0} color="text-gray-800" />
                    <StatCard label="Total Success" value={stats.total_success ?? 0} color="text-green-600" />
                    <StatCard label="Total Retried" value={stats.total_retried ?? 0} color="text-amber-600" />
                    <StatCard label="Still Failed" value={stats.total_failed ?? 0} color="text-red-600" />
                    <StatCard label="Amount Paid" value={formatNaira(stats.amount_paid)} color="text-indigo-600" />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Per-Databoy Breakdown</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {databoys.length}</p>
                        </div>

                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All</option>
                            <option value="success">Success</option>
                            <option value="failed">Still Failed</option>
                            <option value="retried">Needed a Retry</option>
                        </select>

                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
                            />
                        </div>
                    </div>

                    {databoys.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">No payment attempts recorded yet.</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No records match your filters.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Name', 'Attempts', 'Latest Status', 'Amount', 'Last Attempt'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((d) => (
                                        <tr key={d.databoy_id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{d.full_name}</td>
                                            <td className="px-5 py-3 text-sm whitespace-nowrap">
                                                <span className={d.attempts > 1 ? 'text-amber-600 font-semibold' : 'text-gray-600'}>
                                                    {d.attempts}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap"><StatusBadge status={d.latest_status} /></td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{formatNaira(d.amount)}</td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(d.latest_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
