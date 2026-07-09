import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/Layouts/AdminLayout';

function AssignModal({ databoy, lgas, onClose }) {
    const [lgaId, setLgaId]     = useState(databoy.lga_id ?? '');
    const [wardId, setWardId]   = useState(databoy.ward_id ?? '');
    const [wards, setWards]     = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState('');

    const handleLgaChange = async (id) => {
        setLgaId(id);
        setWardId('');
        setWards([]);
        if (!id) return;
        setLoading(true);
        try {
            const { data } = await axios.get(route('admin.api.available-wards', id), {
                params: { exclude: databoy.id },
            });
            setWards(data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const handleSave = () => {
        if (!lgaId || !wardId) { setError('Please select both an LGA and a ward.'); return; }
        setSaving(true);
        router.post(route('admin.databoy.assign', databoy.id), { lga_id: lgaId, ward_id: wardId }, {
            onSuccess: () => onClose(),
            onError: (e) => { setError(Object.values(e)[0] ?? 'Failed to assign.'); setSaving(false); },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">Assign Ward</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-sm text-gray-500">Assigning ward for <span className="font-semibold text-gray-700">{databoy.full_name}</span></p>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">LGA</label>
                        <select value={lgaId} onChange={(e) => handleLgaChange(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            <option value="">Select LGA…</option>
                            {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Ward</label>
                        <select value={wardId} onChange={(e) => setWardId(e.target.value)}
                            disabled={!lgaId || loading}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-50">
                            <option value="">{loading ? 'Loading wards…' : 'Select ward…'}</option>
                            {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                        {lgaId && !loading && wards.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600">No available wards in this LGA.</p>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 pt-1">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving || !lgaId || !wardId}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
                        {saving ? 'Saving…' : 'Assign Ward'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ReleaseModal({ databoy, onConfirm, onClose, loading }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">Release Ward</h3>
                        <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone without reassigning.</p>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
                    <p className="text-xs text-gray-500">Databoy</p>
                    <p className="text-sm font-semibold text-gray-800">{databoy.full_name}</p>
                    <p className="text-xs text-gray-500 mt-2">Ward to be released</p>
                    <p className="text-sm font-semibold text-red-600">{databoy.ward?.name}</p>
                    {databoy.lga?.name && (
                        <p className="text-xs text-gray-400">{databoy.lga.name}</p>
                    )}
                </div>

                <p className="text-sm text-gray-600">
                    The ward will become available for other databoys to pick after release.
                </p>

                <div className="flex gap-3">
                    <button onClick={onClose} disabled={loading}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
                        {loading ? 'Releasing…' : 'Yes, Release'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DataboyWardAssignment({ databoys = [], lgas = [] }) {
    const { flash } = usePage().props;
    const [search, setSearch]           = useState('');
    const [editingDb, setEditingDb]     = useState(null);
    const [releasingDb, setReleasingDb] = useState(null);
    const [releasing, setReleasing]     = useState(false);

    const filtered = search.trim()
        ? databoys.filter((db) => {
            const q = search.toLowerCase();
            return (
                db.full_name?.toLowerCase().includes(q) ||
                db.ward?.name?.toLowerCase().includes(q) ||
                db.lga?.name?.toLowerCase().includes(q)
            );
        })
        : databoys;

    const handleRelease = () => {
        setReleasing(true);
        router.post(route('admin.databoy.release', releasingDb.id), {}, {
            onSuccess: () => { setReleasingDb(null); setReleasing(false); },
            onError:   () => setReleasing(false),
        });
    };

    return (
        <AdminLayout title="Databoy Ward Assignment">
            {editingDb && (
                <AssignModal databoy={editingDb} lgas={lgas} onClose={() => setEditingDb(null)} />
            )}
            {releasingDb && (
                <ReleaseModal
                    databoy={releasingDb}
                    loading={releasing}
                    onConfirm={handleRelease}
                    onClose={() => !releasing && setReleasingDb(null)}
                />
            )}

            <div className="max-w-5xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Databoy Ward Assignment</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Reassign or release the LGA/ward a databoy is registering for.</p>
                </div>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                        {flash.success}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Databoys</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {databoys.length} agent{databoys.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name, LGA, or ward…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                            />
                        </div>
                    </div>

                    {databoys.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">No databoys registered yet.</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No databoys match that search.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['#', 'Name', 'LGA', 'Ward', 'Actions'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((db, idx) => (
                                        <tr key={db.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-xs text-gray-400">{idx + 1}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                        <span className="text-indigo-700 text-xs font-bold">{db.full_name?.charAt(0)}</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{db.full_name}</p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-lg whitespace-nowrap">
                                                    {db.lga?.name ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{db.ward?.name ?? '—'}</td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {db.ward_id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setReleasingDb(db)}
                                                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                                                        >
                                                            Release
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingDb(db)}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                                                    >
                                                        {db.ward_id ? 'Reassign' : 'Assign'}
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
