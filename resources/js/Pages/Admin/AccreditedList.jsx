import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function AccreditedList({ applications = [] }) {
    const [search, setSearch] = useState('');

    const filtered = search.trim()
        ? applications.filter((app) => {
            const q = search.toLowerCase();
            return (
                app.full_name?.toLowerCase().includes(q) ||
                app.calling_phone_number?.toLowerCase().includes(q) ||
                app.databoy?.full_name?.toLowerCase().includes(q) ||
                app.ward?.name?.toLowerCase().includes(q) ||
                app.lga?.name?.toLowerCase().includes(q)
            );
        })
        : applications;

    return (
        <AdminLayout title="Accredited List">
            <div className="max-w-5xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Accredited List</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Applicants who have been accredited on-site.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Accredited</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {applications.length} record{applications.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name, phone, ward, or databoy…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
                            />
                        </div>
                    </div>

                    {applications.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">No applicants have been accredited yet.</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No accredited applicants match that search.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['#', 'Applicant', 'Registered By', 'Ward', 'Accredited By', 'Accredited On'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((app, idx) => (
                                        <tr key={app.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-xs text-gray-400">{idx + 1}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    {app.passport_photograph_path ? (
                                                        <img src={`/storage/${app.passport_photograph_path}`} alt={app.full_name}
                                                            className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 shrink-0" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                            <span className="text-indigo-600 text-xs font-bold">{app.full_name?.charAt(0)}</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{app.full_name}</p>
                                                        <p className="text-xs text-gray-400">{app.calling_phone_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg whitespace-nowrap">
                                                    {app.databoy?.full_name ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{app.ward?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                {app.accreditor_name}
                                                {app.accreditor_type && (
                                                    <span className={`ml-1.5 inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                                        app.accreditor_type === 'Admin' ? 'bg-purple-50 text-purple-600' : 'bg-teal-50 text-teal-600'
                                                    }`}>
                                                        {app.accreditor_type}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {app.accredited_at
                                                    ? new Date(app.accredited_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
