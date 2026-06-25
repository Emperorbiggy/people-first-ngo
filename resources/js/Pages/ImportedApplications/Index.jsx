import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function Index({ applications }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [lgaFilter, setLgaFilter] = useState('all');

    const lgas = [...new Set(applications.map((a) => a.lga).filter(Boolean))].sort();

    const filtered = applications.filter((a) => {
        const q = search.toLowerCase();
        const matchesSearch =
            a.full_name?.toLowerCase().includes(q) ||
            a.phone_number?.toLowerCase().includes(q) ||
            a.whatsapp_number?.toLowerCase().includes(q) ||
            a.highest_qualification?.toLowerCase().includes(q) ||
            a.ward?.toLowerCase().includes(q) ||
            a.unit?.toLowerCase().includes(q);
        const matchesLga = lgaFilter === 'all' || a.lga === lgaFilter;
        return matchesSearch && matchesLga;
    });

    const exportUrl = lgaFilter === 'all'
        ? route('imported-applications.export')
        : route('imported-applications.export', { lga: lgaFilter });

    return (
        <AdminLayout title="Imported Applications">
            <div className="max-w-7xl mx-auto">
                {/* Flash message */}
                {flash?.success && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-sm text-green-800 font-medium">{flash.success}</p>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Imported Applications</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{applications.length} total records</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={exportUrl}
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export Excel
                        </a>
                        <Link
                            href={route('imported-applications.import')}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3-3m0 0l3 3m-3-3v8" />
                            </svg>
                            Import CSV
                        </Link>
                    </div>
                </div>

                {/* Search & LGA filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, phone, ward, unit..."
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>
                    <select
                        value={lgaFilter}
                        onChange={(e) => setLgaFilter(e.target.value)}
                        className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white sm:w-56"
                    >
                        <option value="all">All LGAs</option>
                        {lgas.map((l) => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="py-20 text-center">
                            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 font-medium">No records found</p>
                            <p className="text-gray-400 text-sm mt-1">
                                {applications.length === 0
                                    ? 'Import a CSV file to get started.'
                                    : 'Try a different search term.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['#', 'Full Name', 'Phone Number', 'WhatsApp Number', 'Highest Qualification', 'LGA', 'Ward', 'Unit', 'Voter Card', 'Imported'].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((app, i) => (
                                        <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">
                                                {app.full_name || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                {app.phone_number || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                {app.whatsapp_number || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {app.highest_qualification || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                {app.lga || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {app.ward || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {app.unit || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    app.has_voter_card
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {app.has_voter_card ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(app.created_at).toLocaleDateString()}
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
