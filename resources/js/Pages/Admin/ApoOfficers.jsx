import { useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function ApoOfficers({ officers = [] }) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all'); // all | replaced | original
    const [dateFrom, setDateFrom] = useState('2026-08-03');
    const [dateTo, setDateTo] = useState('');

    const filtered = useMemo(() => {
        return officers.filter((o) => {
            const q = search.trim().toLowerCase();
            const matchesSearch = q
                ? o.full_name?.toLowerCase().includes(q) ||
                  o.phone_number?.toLowerCase().includes(q) ||
                  o.lga?.toLowerCase().includes(q) ||
                  o.ward?.toLowerCase().includes(q) ||
                  o.registered_by?.toLowerCase().includes(q)
                : true;
            const matchesStatus = status === 'all' ? true : status === 'replaced' ? o.is_replaced : !o.is_replaced;

            // Date range only applies to replaced records — an "original" row
            // has no replaced_at to filter on, so it's exempt from this filter
            // rather than always being excluded when a range is set.
            let matchesDate = true;
            if (o.is_replaced && o.replaced_at && (dateFrom || dateTo)) {
                const replacedDate = o.replaced_at.slice(0, 10);
                if (dateFrom && replacedDate < dateFrom) matchesDate = false;
                if (dateTo && replacedDate > dateTo) matchesDate = false;
            }

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [officers, search, status, dateFrom, dateTo]);

    const replacedCount = useMemo(() => officers.filter((o) => o.is_replaced).length, [officers]);

    return (
        <AdminLayout title="APO Officers">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">APO Officers</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Applicants qualified as APO officers by the databoys who registered them.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <a href={route('admin.apo-officers.export', { status: 'all' })}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition whitespace-nowrap">
                            Export All
                        </a>
                        <a href={route('admin.apo-officers.export', { status: 'replaced', from: dateFrom, to: dateTo })}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition whitespace-nowrap">
                            Export Replaced
                        </a>
                        <a href={route('admin.apo-officers.export', { status: 'original' })}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition whitespace-nowrap">
                            Export Original
                        </a>
                    </div>
                </div>

                {status === 'replaced' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Replaced Between</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            placeholder="Up till date"
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {(dateFrom || dateTo) && (
                            <button
                                type="button"
                                onClick={() => { setDateFrom(''); setDateTo(''); }}
                                className="text-xs text-indigo-600 hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Qualified Officers</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {officers.length} record{officers.length !== 1 ? 's' : ''} · {replacedCount} replaced</p>
                        </div>

                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All</option>
                            <option value="replaced">Replaced</option>
                            <option value="original">Not Replaced (Original)</option>
                        </select>

                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name, phone, LGA, ward, or databoy…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
                            />
                        </div>
                    </div>

                    {officers.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">No APO officers have been qualified yet.</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No officers match your filters.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Name', 'Status', 'Phone Number', 'Email', 'LGA', 'Ward', 'Registered By', 'Qualified At', 'Replaced At'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((o) => (
                                        <tr key={o.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">
                                                {o.full_name}
                                                {o.is_replaced && o.previous_full_name && (
                                                    <span className="ml-1 text-xs font-normal text-gray-400">(Replaced: {o.previous_full_name})</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                {o.is_replaced ? (
                                                    <span className="inline-flex px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-lg">Replaced</span>
                                                ) : (
                                                    <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">Original</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{o.phone_number}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{o.email}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{o.lga}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{o.ward}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{o.registered_by}</td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(o.qualified_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {o.replaced_at
                                                    ? new Date(o.replaced_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                    : '—'}
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
