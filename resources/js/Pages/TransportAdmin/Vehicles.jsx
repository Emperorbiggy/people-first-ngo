import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import TransportAdminLayout from '@/Layouts/TransportAdminLayout';
import Pagination from '@/Components/Pagination';

export default function Vehicles({ vehicles, filters, categories = {}, lgas = [], agents = [], counts }) {
    const [term, setTerm] = useState(filters.search || '');
    const [photo, setPhoto] = useState(null);

    const rows  = vehicles?.data ?? [];
    const total = vehicles?.total ?? 0;

    const apply = (next) => {
        router.get(route('transport-admin.vehicles'), { ...filters, q: term, ...next }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    // Downloads carry the same filters, so a file matches what is on screen.
    const exportParams = {
        category: filters.category, lga: filters.lga, agent: filters.agent,
        from: filters.from, to: filters.to,
    };

    const tabs = [
        { key: 'all', label: 'All', count: counts.all },
        ...Object.entries(categories).map(([key, label]) => ({ key, label, count: counts[key] })),
    ];

    const select = 'px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400';

    return (
        <TransportAdminLayout title="Vehicle Register">
            <div className="max-w-7xl mx-auto space-y-4">

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <form onSubmit={(e) => { e.preventDefault(); apply({}); }} className="flex-1 min-w-[15rem]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                            <input type="search" value={term} onChange={(e) => setTerm(e.target.value)}
                                placeholder="Plate, owner, phone or model — press Enter"
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                        </form>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">LGA</label>
                            <select value={filters.lga} onChange={(e) => apply({ lga: e.target.value })} className={select}>
                                <option value="all">All LGAs</option>
                                {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Agent</label>
                            <select value={filters.agent} onChange={(e) => apply({ agent: e.target.value })} className={select}>
                                <option value="all">All agents</option>
                                {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                            <input type="date" value={filters.from || ''} onChange={(e) => apply({ from: e.target.value })} className={select} />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                            <input type="date" value={filters.to || ''} onChange={(e) => apply({ to: e.target.value })} className={select} />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                            {tabs.map((t) => (
                                <button key={t.key} onClick={() => apply({ category: t.key })}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                                        filters.category === t.key ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {t.label} <span className="tabular-nums opacity-80">({(t.count ?? 0).toLocaleString()})</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <a href={route('transport-admin.exports.vehicles', exportParams)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow transition">
                                Excel (.xlsx)
                            </a>
                            <a href={route('transport-admin.exports.photos', { ...exportParams, file: 'vehicle', batch: 1 })}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition">
                                Vehicle photos ZIP
                            </a>
                            <a href={route('transport-admin.exports.photos', { ...exportParams, file: 'owner', batch: 1 })}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl shadow transition">
                                Owner photos ZIP
                            </a>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400">
                        Excel covers every matching record in one file. Photo ZIPs come 300 at a time — add
                        <code className="mx-1 px-1 bg-gray-100 rounded">&amp;batch=2</code> to the address for the next set.
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800 text-sm">Captured vehicles</h2>
                        <span className="text-sm text-gray-400">{total.toLocaleString()} record{total !== 1 ? 's' : ''}</span>
                    </div>

                    {rows.length === 0 ? (
                        <p className="px-5 py-14 text-center text-sm text-gray-400">No vehicles match those filters.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['#', 'Plate', 'Type', 'Owner', 'LGA', 'Captured by', 'Photos', 'Date'].map((h) => (
                                            <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {rows.map((v, idx) => (
                                        <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-4 py-3 text-xs text-gray-400">{(vehicles.from ?? 1) + idx}</td>

                                            <td className="px-4 py-3">
                                                <p className="text-sm font-bold text-gray-800 tracking-wide whitespace-nowrap">{v.plate_number}</p>
                                                <p className="text-xs text-gray-400">{[v.make_model, v.colour].filter(Boolean).join(' · ') || '—'}</p>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                                                    v.category === 'bus' ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'
                                                }`}>
                                                    {v.vehicle_type}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                <span className="block text-sm text-gray-800 whitespace-nowrap">{v.owner_name}</span>
                                                <span className="text-gray-400 tabular-nums">{v.owner_phone}</span>
                                            </td>

                                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{v.lga_name ?? '—'}</td>

                                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                <Link href={route('transport-admin.agents.show', v.agent_id)}
                                                    className="text-slate-700 hover:underline">
                                                    {v.agent}
                                                </Link>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="flex gap-1.5">
                                                    {v.vehicle_photo_url ? (
                                                        <button onClick={() => setPhoto({ url: v.vehicle_photo_url, label: `${v.plate_number} — vehicle` })}>
                                                            <img src={v.vehicle_photo_url} alt="vehicle"
                                                                className="w-9 h-9 rounded-lg object-cover border border-gray-200 hover:ring-2 hover:ring-slate-400 transition" />
                                                        </button>
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-lg bg-gray-50 border border-dashed border-gray-200" title="No vehicle photo" />
                                                    )}
                                                    {v.owner_photo_url ? (
                                                        <button onClick={() => setPhoto({ url: v.owner_photo_url, label: `${v.plate_number} — owner` })}>
                                                            <img src={v.owner_photo_url} alt="owner"
                                                                className="w-9 h-9 rounded-lg object-cover border border-gray-200 hover:ring-2 hover:ring-slate-400 transition" />
                                                        </button>
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-lg bg-gray-50 border border-dashed border-gray-200" title="No owner photo" />
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(v.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination paginator={vehicles} colorClass="bg-slate-800" />
                </div>
            </div>

            {photo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPhoto(null)}>
                    <div className="absolute inset-0 bg-black/75" />
                    <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-white text-sm font-medium">{photo.label}</p>
                            <button onClick={() => setPhoto(null)} className="text-white/70 hover:text-white text-sm">Close</button>
                        </div>
                        <img src={photo.url} alt={photo.label} className="w-full rounded-2xl" />
                    </div>
                </div>
            )}
        </TransportAdminLayout>
    );
}
