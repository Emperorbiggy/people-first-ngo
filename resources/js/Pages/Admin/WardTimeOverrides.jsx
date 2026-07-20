import { useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

function OverrideModal({ ward, onClose }) {
    const [checkinStart, setCheckinStart] = useState(ward.override?.checkin_start ?? '13:00');
    const [checkinEnd, setCheckinEnd] = useState(ward.override?.checkin_end ?? '15:00');
    const [checkoutStart, setCheckoutStart] = useState(ward.override?.checkout_start ?? '15:00');
    const [checkoutEnd, setCheckoutEnd] = useState(ward.override?.checkout_end ?? '18:00');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const save = () => {
        setSaving(true);
        setError('');
        router.post(route('admin.ward-time-overrides.store', ward.id), {
            checkin_start: checkinStart,
            checkin_end: checkinEnd,
            checkout_start: checkoutStart,
            checkout_end: checkoutEnd,
        }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (e) => setError(Object.values(e)[0] ?? 'Failed to save.'),
            onFinish: () => setSaving(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={!saving ? onClose : undefined} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                <div>
                    <h3 className="font-bold text-gray-800">Override Time — {ward.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Applies today only ({ward.lga ?? 'no LGA'}). Automatically reverts to the default 7–12 / 2–5 windows tomorrow.</p>
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-medium text-gray-600">Check-in Start</label>
                        <input type="time" value={checkinStart} onChange={(e) => setCheckinStart(e.target.value)}
                            className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600">Check-in End</label>
                        <input type="time" value={checkinEnd} onChange={(e) => setCheckinEnd(e.target.value)}
                            className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600">Checkout Start</label>
                        <input type="time" value={checkoutStart} onChange={(e) => setCheckoutStart(e.target.value)}
                            className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600">Checkout End</label>
                        <input type="time" value={checkoutEnd} onChange={(e) => setCheckoutEnd(e.target.value)}
                            className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button type="button" onClick={onClose} disabled={saving}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="button" onClick={save} disabled={saving}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
                        {saving ? 'Saving…' : 'Save Override'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function formatTime(hm) {
    if (!hm) return '';
    const [h, m] = hm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function WardTimeOverrides({ wards = [] }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [editingWard, setEditingWard] = useState(null);
    const [clearingId, setClearingId] = useState(null);

    const filtered = useMemo(() => {
        if (!search.trim()) return wards;
        const q = search.toLowerCase();
        return wards.filter((w) => w.name?.toLowerCase().includes(q) || w.lga?.toLowerCase().includes(q));
    }, [wards, search]);

    const clearOverride = (ward) => {
        setClearingId(ward.id);
        router.delete(route('admin.ward-time-overrides.destroy', ward.id), {
            preserveScroll: true,
            onFinish: () => setClearingId(null),
        });
    };

    return (
        <AdminLayout title="Ward Time Overrides">
            <div className="max-w-5xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Ward Time Overrides</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Give a ward a custom check-in/checkout window for today only — e.g. if they missed the normal 7–12 or 2–5 windows. Reverts to default automatically at midnight.
                    </p>
                </div>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                        {flash.success}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Wards</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {wards.length} ward{wards.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by ward or LGA…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                            />
                        </div>
                    </div>

                    {wards.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">No wards found. Import geo data first.</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No wards match that search.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Ward', 'LGA', "Today's Window", 'Action'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((w) => (
                                        <tr key={w.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{w.name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{w.lga ?? '—'}</td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                {w.override ? (
                                                    <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border bg-violet-50 border-violet-200 text-violet-700">
                                                        In: {formatTime(w.override.checkin_start)}–{formatTime(w.override.checkin_end)} · Out: {formatTime(w.override.checkout_start)}–{formatTime(w.override.checkout_end)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Default (7–12 / 2–5)</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingWard(w)}
                                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                                                >
                                                    {w.override ? 'Edit' : 'Set Override'}
                                                </button>
                                                {w.override && (
                                                    <button
                                                        type="button"
                                                        onClick={() => clearOverride(w)}
                                                        disabled={clearingId === w.id}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                                                    >
                                                        {clearingId === w.id ? 'Clearing…' : 'Clear'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>

            {editingWard && (
                <OverrideModal ward={editingWard} onClose={() => setEditingWard(null)} />
            )}
        </AdminLayout>
    );
}
