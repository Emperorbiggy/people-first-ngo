import { useMemo, useState } from 'react';
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

export default function DataPurchaseHistory({ history = [], stats = {} }) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');

    const filtered = useMemo(() => {
        return history.filter((h) => {
            const matchesSearch = search.trim()
                ? h.full_name?.toLowerCase().includes(search.trim().toLowerCase()) || h.phone_number?.includes(search.trim())
                : true;
            const matchesStatus = status === 'all' ? true : h.status === status;
            return matchesSearch && matchesStatus;
        });
    }, [history, search, status]);

    return (
        <AdminLayout title="Data Purchase History">
            <div className="max-w-6xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Data Purchase History</h1>
                    <p className="text-sm text-gray-500 mt-0.5">All data bundle purchase attempts processed via EasiGateway.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Total Attempts" value={stats.total ?? 0} color="text-gray-800" />
                    <StatCard label="Success" value={stats.success ?? 0} color="text-green-600" />
                    <StatCard label="Failed" value={stats.failed ?? 0} color="text-red-600" />
                    <StatCard label="Amount Spent" value={formatNaira(stats.amount_sent)} color="text-indigo-600" />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Purchase Records</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {history.length} record{history.length !== 1 ? 's' : ''}</p>
                        </div>

                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All statuses</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                        </select>

                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name or phone…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
                            />
                        </div>
                    </div>

                    {history.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-gray-400 text-sm">No data purchases have been made yet.</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No records match your filters.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Name', 'Network', 'Phone Number', 'Bundle', 'Amount', 'Status', 'Date'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((h) => (
                                        <tr key={h.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{h.full_name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{h.network}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{h.phone_number}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{h.bundle_code ?? '—'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{formatNaira(h.amount)}</td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <StatusBadge status={h.status} />
                                                {h.status === 'failed' && h.message && (
                                                    <p className="text-xs text-red-400 mt-1 max-w-xs truncate" title={h.message}>{h.message}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(h.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
