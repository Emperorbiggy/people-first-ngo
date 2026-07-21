import { useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function NewFormData({ entries = [] }) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return entries;
        const q = search.toLowerCase();
        return entries.filter((e) =>
            e.full_name?.toLowerCase().includes(q) ||
            e.phone_number?.toLowerCase().includes(q) ||
            e.ward?.name?.toLowerCase().includes(q) ||
            e.lga?.name?.toLowerCase().includes(q)
        );
    }, [entries, search]);

    return (
        <AdminLayout title="Form Registrations">
            <div className="max-w-5xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Form Registrations</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Submissions from the public registration form — one per ward.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Registrations</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {entries.length} record{entries.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name, phone, ward, or LGA…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
                            />
                        </div>
                    </div>

                    {entries.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">No registrations yet.</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No registrations match that search.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Passport', 'Name', 'Phone Number', 'LGA', 'Ward', 'Registered'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((e) => (
                                        <tr key={e.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3">
                                                {e.passport_photograph_path ? (
                                                    <img src={`/storage/${e.passport_photograph_path}`} alt={e.full_name}
                                                        className="w-9 h-9 rounded-full object-cover border-2 border-gray-100" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                                                        <span className="text-indigo-600 text-xs font-bold">{e.full_name?.charAt(0)}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{e.full_name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{e.phone_number}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{e.lga?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{e.ward?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(e.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
