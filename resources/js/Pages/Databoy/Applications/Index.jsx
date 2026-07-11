import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import DataboyLayout from '@/Layouts/DataboyLayout';

function EditPollingUnitModal({ application, pollingUnits, onClose }) {
    const [pollingUnitId, setPollingUnitId] = useState(application.polling_unit?.id ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    const handleSave = () => {
        if (!pollingUnitId) { setError('Please select a polling unit.'); return; }
        setSaving(true);
        router.put(route('databoy.applications.update-polling-unit', application.id), { polling_unit_id: pollingUnitId }, {
            onSuccess: () => onClose(),
            onError: (e) => { setError(Object.values(e)[0] ?? 'Failed to update.'); setSaving(false); },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">Edit Polling Unit</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-sm text-gray-500">
                    Correcting the polling unit for <span className="font-semibold text-gray-700">{application.full_name}</span>
                </p>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Polling Unit</label>
                    <select value={pollingUnitId} onChange={(e) => setPollingUnitId(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <option value="">Select polling unit…</option>
                        {pollingUnits.map((pu) => <option key={pu.id} value={pu.id}>{pu.name}</option>)}
                    </select>
                    {pollingUnits.length === 0 && (
                        <p className="mt-1 text-xs text-amber-600">No polling units found for your assigned ward.</p>
                    )}
                </div>

                <div className="flex gap-3 pt-1">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving || !pollingUnitId}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Index({ applications, pollingUnits = [] }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [editingApp, setEditingApp] = useState(null);

    const filtered = applications.filter((a) => {
        const q = search.toLowerCase();
        return (
            a.full_name?.toLowerCase().includes(q) ||
            a.calling_phone_number?.toLowerCase().includes(q) ||
            a.state_of_residence?.toLowerCase().includes(q) ||
            a.lga?.name?.toLowerCase().includes(q) ||
            a.ward?.name?.toLowerCase().includes(q)
        );
    });

    return (
        <DataboyLayout title="My Applications">
            {editingApp && (
                <EditPollingUnitModal
                    application={editingApp}
                    pollingUnits={pollingUnits}
                    onClose={() => setEditingApp(null)}
                />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">My Applications</h1>
                    <p className="text-sm text-gray-500">{applications.length} total</p>
                </div>
                <Link
                    href={route('databoy.applications.create')}
                    className="inline-flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Application
                </Link>
            </div>

            {flash?.success && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium mb-5">
                    {flash.success}
                </div>
            )}

            {/* Search */}
            <div className="relative mb-5">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, phone, LGA, ward…"
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <p className="text-gray-400 text-sm">
                            {applications.length === 0 ? 'No applications yet. ' : 'No results found. '}
                            <Link href={route('databoy.applications.create')} className="text-indigo-600 hover:underline">
                                Add one now →
                            </Link>
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['#', 'Name', 'Phone', 'State', 'LGA', 'Ward', 'Polling Unit', 'Date', 'Actions'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((app, i) => (
                                    <tr key={app.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{app.full_name}</p>
                                            <p className="text-xs text-gray-400">{app.email_address}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{app.calling_phone_number}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-lg">
                                                {app.state_of_residence}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{app.lga?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{app.ward?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{app.polling_unit?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                            {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => setEditingApp(app)}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                                            >
                                                Edit PU
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DataboyLayout>
    );
}
