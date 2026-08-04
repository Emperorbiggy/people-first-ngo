import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import DataboyLayout from '@/Layouts/DataboyLayout';

export default function Index({ applications = [] }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [qualifyingId, setQualifyingId] = useState(null);

    const filtered = applications.filter((a) => {
        const q = search.toLowerCase();
        return (
            a.full_name?.toLowerCase().includes(q) ||
            a.calling_phone_number?.toLowerCase().includes(q) ||
            a.lga?.name?.toLowerCase().includes(q) ||
            a.ward?.name?.toLowerCase().includes(q)
        );
    });

    const qualify = (application) => {
        setQualifyingId(application.id);
        router.post(route('databoy.apo-officers.qualify', application.id), {}, {
            preserveScroll: true,
            onFinish: () => setQualifyingId(null),
        });
    };

    return (
        <DataboyLayout title="APO Officers">
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-800">APO Officers</h1>
                <p className="text-sm text-gray-500 mt-0.5">Qualify your registrations as APO officers.</p>
            </div>

            {flash?.success && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium mb-5">
                    {flash.success}
                </div>
            )}

            {flash?.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium mb-5">
                    {flash.error}
                </div>
            )}

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

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="py-16 text-center text-sm text-gray-400">
                        {applications.length === 0 ? 'You have no registrations yet.' : 'No results found.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['#', 'Name', 'Phone', 'LGA', 'Ward', 'Status', 'Actions'].map((h) => (
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
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{app.full_name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{app.calling_phone_number}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{app.lga?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{app.ward?.name ?? '—'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {app.apo_officer ? (
                                                <span className="inline-flex px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg">
                                                    Qualified APO
                                                </span>
                                            ) : (
                                                <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg">
                                                    Not Qualified
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {!app.apo_officer && (
                                                <button
                                                    type="button"
                                                    onClick={() => qualify(app)}
                                                    disabled={qualifyingId === app.id}
                                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition"
                                                >
                                                    {qualifyingId === app.id ? 'Qualifying…' : 'Qualify as APO'}
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
        </DataboyLayout>
    );
}
