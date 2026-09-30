import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import TransportAdminLayout from '@/Layouts/TransportAdminLayout';
import Pagination from '@/Components/Pagination';

const STATUSES = [
    { key: 'all',         label: 'All' },
    { key: 'active',      label: 'Active' },
    { key: 'suspended',   label: 'Suspended' },
    { key: 'no_passport', label: 'No passport' },
];

export default function Agents({ agents, filters, lgas = [], categories = {} }) {
    const [term, setTerm] = useState(filters.search || '');

    const rows  = agents?.data ?? [];
    const total = agents?.total ?? 0;

    // Every filter is applied in the database, so the page only ever holds the
    // rows it is showing.
    const apply = (next) => {
        router.get(route('transport-admin.agents'), { ...filters, q: term, ...next }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const exportUrl = route('transport-admin.exports.agents', {
        lga: filters.lga,
        category: filters.category,
    });

    const select = 'px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400';

    return (
        <TransportAdminLayout title="Transport Agents">
            <div className="max-w-7xl mx-auto space-y-4">

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <form onSubmit={(e) => { e.preventDefault(); apply({}); }} className="flex-1 min-w-[16rem]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                            <input type="search" value={term} onChange={(e) => setTerm(e.target.value)}
                                placeholder="Name, phone, account, branch or zone — press Enter"
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                        </form>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Stream</label>
                            <select value={filters.category} onChange={(e) => apply({ category: e.target.value })} className={select}>
                                <option value="all">All streams</option>
                                {Object.entries(categories).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">LGA</label>
                            <select value={filters.lga} onChange={(e) => apply({ lga: e.target.value })} className={select}>
                                <option value="all">All LGAs</option>
                                {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>

                        <a href={exportUrl}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow transition">
                            Excel (.xlsx)
                        </a>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {STATUSES.map((s) => (
                            <button key={s.key} onClick={() => apply({ status: s.key })}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                                    filters.status === s.key ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800 text-sm">Agents</h2>
                        <span className="text-sm text-gray-400">{total.toLocaleString()} record{total !== 1 ? 's' : ''}</span>
                    </div>

                    {rows.length === 0 ? (
                        <p className="px-5 py-14 text-center text-sm text-gray-400">No agents match those filters.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['#', 'Agent', 'Stream', 'LGA / Zone / Branch', 'Bank', 'Captured', 'Status', ''].map((h) => (
                                            <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {rows.map((a, idx) => (
                                        <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-4 py-3 text-xs text-gray-400">{(agents.from ?? 1) + idx}</td>

                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {a.passport_url ? (
                                                        <img src={a.passport_url} alt={a.full_name}
                                                            className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 shrink-0" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center shrink-0"
                                                            title="No passport photograph on file">
                                                            <span className="text-red-500 text-xs font-bold">{a.full_name?.charAt(0)}</span>
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{a.full_name}</p>
                                                        <p className="text-xs text-gray-400 tabular-nums">{a.phone_number}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg whitespace-nowrap">
                                                    {a.stream ?? '—'}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                                {a.lga_name ?? '—'}
                                                <span className="block text-gray-400">
                                                    {[a.zone, a.branch_name].filter(Boolean).join(' · ') || '—'}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                                {a.bank_name ?? '—'}
                                                <span className="block text-gray-400 tabular-nums">{a.account_number}</span>
                                            </td>

                                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                <span className="font-bold text-gray-800 tabular-nums">{(a.vehicles ?? 0).toLocaleString()}</span>
                                                <span className="block text-gray-400 tabular-nums">
                                                    {a.bike} bike · {a.korope} korope
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                                                    a.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                                }`}>
                                                    {a.is_active ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <Link href={route('transport-admin.agents.show', a.id)}
                                                    className="text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap">
                                                    View →
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination paginator={agents} colorClass="bg-slate-800" />
                </div>

            </div>
        </TransportAdminLayout>
    );
}
