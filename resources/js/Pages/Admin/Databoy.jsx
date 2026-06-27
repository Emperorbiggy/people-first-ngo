import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/Layouts/AdminLayout';

function StatCard({ label, value, icon, color }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
}

function CopyBtn({ text }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <button type="button" onClick={copy} title="Copy"
            className="ml-1.5 text-gray-400 hover:text-indigo-600 transition">
            {copied
                ? <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            }
        </button>
    );
}

function PasswordCell({ password }) {
    const [show, setShow] = useState(false);
    return (
        <div className="flex items-center gap-1 whitespace-nowrap">
            <span className={`text-sm font-mono ${show ? 'text-gray-800' : 'text-gray-300 tracking-widest'}`}>
                {show ? password : '••••••••••'}
            </span>
            <button type="button" onClick={() => setShow(s => !s)} title={show ? 'Hide' : 'Show'}
                className="text-gray-400 hover:text-indigo-600 transition">
                {show
                    ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
            </button>
            {show && <CopyBtn text={password} />}
        </div>
    );
}

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

export default function DataboyAdmin({ stats = {}, lgaCoverage = [], databoys = [], lgas = [] }) {
    const { flash } = usePage().props;
    const [wardFilter, setWardFilter] = useState('');
    const [editingDb, setEditingDb]   = useState(null);
    const [releasing, setReleasing]   = useState(null);

    const filtered = wardFilter.trim()
        ? databoys.filter((db) => {
            const q = wardFilter.toLowerCase();
            return (
                db.ward?.name?.toLowerCase().includes(q) ||
                db.full_name?.toLowerCase().includes(q)
            );
        })
        : databoys;

    const handleRelease = (db) => {
        if (!confirm(`Release ${db.full_name} from ward "${db.ward?.name}"? The ward will become available again.`)) return;
        setReleasing(db.id);
        router.post(route('admin.databoy.release', db.id), {}, {
            onFinish: () => setReleasing(null),
        });
    };

    return (
        <AdminLayout title="Databoy Overview">
            {editingDb && (
                <AssignModal
                    databoy={editingDb}
                    lgas={lgas}
                    onClose={() => setEditingDb(null)}
                />
            )}

            <div className="max-w-7xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Databoy Overview</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Ward coverage and registered databoy agents.</p>
                </div>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                        {flash.success}
                    </div>
                )}

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="Registered Databoys" value={stats.total ?? 0} color="bg-indigo-100"
                        icon={<svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    />
                    <StatCard label="LGAs with Databoy" value={stats.lgas ?? 0} color="bg-violet-100"
                        icon={<svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    />
                    <StatCard label="Wards with Databoy" value={stats.wards ?? 0} color="bg-teal-100"
                        icon={<svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>}
                    />
                </div>

                {/* LGA Coverage Chart */}
                {lgaCoverage.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-semibold text-gray-800 mb-1">Ward Coverage by LGA</h3>
                        <p className="text-xs text-gray-400 mb-5 flex items-center gap-3">
                            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-indigo-500"></span> Registered</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-gray-200"></span> Pending</span>
                        </p>
                        <div className="space-y-4">
                            {lgaCoverage.map((lga) => {
                                const total = lga.wards_count ?? 0;
                                const registered = lga.registered_count ?? 0;
                                const pct = total > 0 ? Math.round((registered / total) * 100) : 0;
                                return (
                                    <div key={lga.id}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-medium text-gray-700">{lga.name}</span>
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className="text-indigo-600 font-medium">{registered} registered</span>
                                                <span className="text-gray-400">{total - registered} pending</span>
                                                <span className={`font-bold ${pct === 100 ? 'text-green-600' : pct > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>{pct}%</span>
                                            </div>
                                        </div>
                                        <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                                            {registered > 0 && <div className="bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />}
                                            {(total - registered) > 0 && <div className="bg-gray-200" style={{ width: `${100 - pct}%` }} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
                        No geo data imported yet. Import geographic data first to see ward coverage.
                    </div>
                )}

                {/* Registered Databoys List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Registered Databoys</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {databoys.length} agent{databoys.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name or ward…"
                                value={wardFilter}
                                onChange={(e) => setWardFilter(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
                            />
                        </div>
                    </div>

                    {databoys.length === 0 ? (
                        <div className="py-16 text-center">
                            <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-gray-400 text-sm">No databoys registered yet.</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No databoys match that search.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['#', 'Name', 'Login Email', 'Password', 'Phone', 'LGA', 'Ward', 'Registered', 'Actions'].map((h) => (
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
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-sm text-gray-600">{db.login_email}</span>
                                                    <CopyBtn text={db.login_email} />
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <PasswordCell password={db.login_password_plain ?? '—'} />
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{db.calling_phone_number}</td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-lg whitespace-nowrap">
                                                    {db.lga?.name ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{db.ward?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(db.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {db.ward_id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRelease(db)}
                                                            disabled={releasing === db.id}
                                                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                                                        >
                                                            {releasing === db.id ? '…' : 'Release'}
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
