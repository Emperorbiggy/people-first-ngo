import { useState } from 'react';
import axios from 'axios';
import AdminLayout from '@/Layouts/AdminLayout';

function pctColor(pct) {
    if (pct === 100) return 'bg-green-500';
    if (pct >= 60)   return 'bg-yellow-400';
    if (pct >= 30)   return 'bg-orange-400';
    return 'bg-red-400';
}

function pctTextColor(pct) {
    if (pct === 100) return 'text-green-700 bg-green-50 border-green-200';
    if (pct >= 60)   return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    if (pct >= 30)   return 'text-orange-700 bg-orange-50 border-orange-200';
    return 'text-red-700 bg-red-50 border-red-200';
}

function SummaryCard({ label, value, sub, color }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}

function DetailModal({ databoy, onClose }) {
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(true);

    useState(() => {
        axios.get(route('admin.databoy-analytics.detail', databoy.id))
            .then(({ data: res }) => setData(res))
            .finally(() => setLoading(false));
    }, []);

    const completedCount = data?.polling_units?.filter(p => p.done).length ?? 0;
    const total          = data?.polling_units?.length ?? 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <p className="font-bold text-gray-800">{databoy.full_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Ward: <span className="font-medium text-gray-700">{databoy.ward ?? '—'}</span>
                            {databoy.lga && <span className="ml-2 text-gray-400">· {databoy.lga}</span>}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-12">
                        <svg className="w-7 h-7 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                    </div>
                ) : (
                    <>
                        {/* Stats strip */}
                        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-6 text-xs text-gray-600">
                            <span><span className="font-bold text-green-700">{completedCount}</span> completed</span>
                            <span><span className="font-bold text-gray-800">{total}</span> total polling units</span>
                            <span className={`ml-auto px-2 py-0.5 rounded-lg border font-semibold text-xs ${pctTextColor(databoy.pct)}`}>
                                {databoy.pct}% done
                            </span>
                        </div>

                        {/* PU list */}
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                            {data?.polling_units?.length === 0 ? (
                                <p className="text-center text-sm text-gray-400 py-10">No polling units in this ward.</p>
                            ) : data?.polling_units?.map((pu) => (
                                <div key={pu.id} className="flex items-center justify-between px-6 py-3 gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${pu.done ? 'bg-green-100' : pu.count === 1 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                                            {pu.done ? (
                                                <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : pu.count === 1 ? (
                                                <svg className="w-3.5 h-3.5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
                                                </svg>
                                            ) : (
                                                <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-700 truncate">{pu.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="flex gap-1">
                                            {[1, 2].map((n) => (
                                                <div key={n} className={`w-4 h-4 rounded-full border-2 ${pu.count >= n ? 'bg-indigo-500 border-indigo-500' : 'border-gray-200 bg-white'}`} />
                                            ))}
                                        </div>
                                        <span className="text-xs text-gray-400 w-10 text-right">{pu.count}/2</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function DataRow({ db, onViewDetail }) {
    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${db.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <div>
                        <p className="text-sm font-medium text-gray-800">{db.full_name}</p>
                        {!db.ward_id && <p className="text-xs text-amber-600 mt-0.5">No ward assigned</p>}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3.5 text-xs text-gray-600">
                {db.ward ? (
                    <>
                        <p className="font-medium text-gray-700">{db.ward}</p>
                        {db.lga && <p className="text-gray-400">{db.lga}</p>}
                    </>
                ) : <span className="text-gray-300">—</span>}
            </td>
            <td className="px-4 py-3.5 text-center">
                {db.ward_id ? (
                    <span className="text-sm font-semibold text-gray-700">{db.total_pus}</span>
                ) : <span className="text-gray-300 text-sm">—</span>}
            </td>
            <td className="px-4 py-3.5">
                {db.ward_id ? (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">{db.completed_pus}/{db.total_pus} units</span>
                            <span className={`font-bold px-1.5 py-0.5 rounded border text-xs ${pctTextColor(db.pct)}`}>{db.pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all ${pctColor(db.pct)}`}
                                style={{ width: `${db.pct}%` }}
                            />
                        </div>
                        <div className="flex gap-3 text-xs text-gray-400">
                            <span className="text-green-600 font-medium">✓ {db.completed_pus}</span>
                            {db.in_progress > 0 && <span className="text-yellow-600">~ {db.in_progress}</span>}
                            {db.not_started > 0 && <span className="text-red-400">✗ {db.not_started}</span>}
                        </div>
                    </div>
                ) : <span className="text-xs text-gray-300">Assign a ward first</span>}
            </td>
            <td className="px-4 py-3.5 text-center">
                <span className="text-sm font-semibold text-indigo-700">{db.total_apps}</span>
            </td>
            <td className="px-4 py-3.5 text-right">
                {db.ward_id && (
                    <button
                        onClick={() => onViewDetail(db)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition"
                    >
                        View Units
                    </button>
                )}
            </td>
        </tr>
    );
}

export default function DataboyAnalytics({ databoys, summary }) {
    const [search, setSearch]   = useState('');
    const [filter, setFilter]   = useState('all');
    const [selected, setSelected] = useState(null);

    const filtered = databoys.filter((db) => {
        const matchSearch = db.full_name.toLowerCase().includes(search.toLowerCase())
            || (db.ward ?? '').toLowerCase().includes(search.toLowerCase())
            || (db.lga ?? '').toLowerCase().includes(search.toLowerCase());

        const matchFilter =
            filter === 'all'         ? true :
            filter === 'complete'    ? db.pct === 100 :
            filter === 'in_progress' ? db.pct > 0 && db.pct < 100 :
            filter === 'not_started' ? db.pct === 0 && db.ward_id :
            filter === 'no_ward'     ? !db.ward_id : true;

        return matchSearch && matchFilter;
    });

    return (
        <AdminLayout title="Analytics">
            <div className="max-w-6xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Databoy Analytics</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Track how many polling units each databoy has completed. A unit is done when 2 people are registered in it.
                    </p>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SummaryCard label="Total Databoys"     value={summary.total}          color="text-gray-800" />
                    <SummaryCard label="Fully Complete"     value={summary.fully_complete}  color="text-green-700" sub="100% of units done" />
                    <SummaryCard label="Avg Completion"     value={`${summary.avg_pct}%`}  color="text-indigo-700" sub="across assigned databoys" />
                    <SummaryCard label="Total Registrations" value={summary.total_apps}     color="text-indigo-700" sub="applicants registered" />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="text"
                        placeholder="Search by name, ward or LGA…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 min-w-48 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    {[
                        { key: 'all',         label: 'All' },
                        { key: 'complete',    label: '100%' },
                        { key: 'in_progress', label: 'In Progress' },
                        { key: 'not_started', label: 'Not Started' },
                        { key: 'no_ward',     label: 'No Ward' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
                                filter === key
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Databoy</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ward / LGA</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Total PUs</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-52">Progress</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Apps</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center text-sm text-gray-400 py-12">
                                            No databoys match the current filter.
                                        </td>
                                    </tr>
                                ) : filtered.map((db) => (
                                    <DataRow key={db.id} db={db} onViewDetail={setSelected} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filtered.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                            Showing {filtered.length} of {databoys.length} databoys
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> 100% complete</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> 60–99%</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> 30–59%</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> 0–29%</span>
                    <span className="ml-auto flex items-center gap-3">
                        <span className="text-green-600 font-medium">✓ completed</span>
                        <span className="text-yellow-600">~ 1 registered</span>
                        <span className="text-red-400">✗ not started</span>
                    </span>
                </div>

            </div>

            {/* Detail modal */}
            {selected && (
                <DetailModal databoy={selected} onClose={() => setSelected(null)} />
            )}
        </AdminLayout>
    );
}
