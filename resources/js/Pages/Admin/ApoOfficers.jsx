import { useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function ApoOfficers({ officers = [] }) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return officers;
        const q = search.toLowerCase();
        return officers.filter((o) =>
            o.full_name?.toLowerCase().includes(q) ||
            o.phone_number?.toLowerCase().includes(q) ||
            o.lga?.toLowerCase().includes(q) ||
            o.ward?.toLowerCase().includes(q) ||
            o.registered_by?.toLowerCase().includes(q)
        );
    }, [officers, search]);

    return (
        <AdminLayout title="APO Officers">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">APO Officers</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Applicants qualified as APO officers by the databoys who registered them.</p>
                    </div>
                    <a
                        href={route('admin.apo-officers.export')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition whitespace-nowrap"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H8a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Excel
                    </a>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Qualified Officers</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {officers.length} record{officers.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name, phone, LGA, ward, or databoy…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-80"
                            />
                        </div>
                    </div>

                    {officers.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">No APO officers have been qualified yet.</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No officers match that search.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Name', 'Phone Number', 'Email', 'LGA', 'Ward', 'Registered By', 'Qualified At'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((o) => (
                                        <tr key={o.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{o.full_name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{o.phone_number}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{o.email}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{o.lga}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{o.ward}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{o.registered_by}</td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(o.qualified_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
