import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';

function StatCard({ label, value, icon, color }) {
    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4`}>
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

export default function Dashboard({ applications, states, selectedState, totalCount, batchCount, statsByState }) {
    const { auth } = usePage().props;
    const [batch, setBatch] = useState(1);
    const [exportState, setExportState] = useState(selectedState);

    const applyFilter = (state) => {
        router.get(route('dashboard'), { state }, { preserveScroll: true });
    };

    const buildExportUrl = (type) => {
        const params = new URLSearchParams({ batch, state: exportState });
        return `/${type === 'excel' ? 'export/excel' : 'export/zip'}?${params}`;
    };

    const totalBatches = Math.max(1, Math.ceil(applications.length / 500));

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title="Admin Dashboard" />

            {/* Top Nav */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div>
                        <span className="font-bold text-gray-800 text-lg">NGO Admin</span>
                        <span className="ml-2 text-xs text-gray-400 hidden sm:inline">Contract Work Programme</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 hidden sm:block">
                        {auth?.user?.name}
                    </span>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </Link>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Applications"
                        value={totalCount}
                        color="bg-blue-100"
                        icon={
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="States Represented"
                        value={statsByState.length}
                        color="bg-purple-100"
                        icon={
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Filtered Results"
                        value={applications.length}
                        color="bg-emerald-100"
                        icon={
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Export Batches"
                        value={totalBatches}
                        color="bg-orange-100"
                        icon={
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        }
                    />
                </div>

                {/* Main content: 2 columns on large screens */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* Left: States breakdown */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                By State
                            </h3>
                            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                                <button
                                    onClick={() => applyFilter('all')}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                                        selectedState === 'all'
                                            ? 'bg-blue-600 text-white font-medium'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <span>All States</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                        selectedState === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                                    }`}>{totalCount}</span>
                                </button>
                                {statsByState.map((s) => (
                                    <button
                                        key={s.state_of_residence}
                                        onClick={() => applyFilter(s.state_of_residence)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                                            selectedState === s.state_of_residence
                                                ? 'bg-blue-600 text-white font-medium'
                                                : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span>{s.state_of_residence}</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                            selectedState === s.state_of_residence ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}>{s.total}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Table + Export */}
                    <div className="lg:col-span-3 space-y-4">

                        {/* Export Panel */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export Data
                                <span className="text-xs text-gray-400 font-normal">(500 records per batch)</span>
                            </h3>
                            <div className="flex flex-wrap gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">State Filter</label>
                                    <select
                                        value={exportState}
                                        onChange={(e) => setExportState(e.target.value)}
                                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                    >
                                        <option value="all">All States</option>
                                        {states.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Batch Number</label>
                                    <select
                                        value={batch}
                                        onChange={(e) => setBatch(Number(e.target.value))}
                                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                    >
                                        {Array.from({ length: totalBatches }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                                Batch {i + 1} (records {(i * 500) + 1}–{Math.min((i + 1) * 500, applications.length)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3">
                                    <a
                                        href={buildExportUrl('excel')}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Excel (.xlsx)
                                    </a>
                                    <a
                                        href={buildExportUrl('zip')}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Passport ZIP
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Applications Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-800">
                                    Applications
                                    {selectedState !== 'all' && (
                                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                            {selectedState}
                                        </span>
                                    )}
                                </h3>
                                <span className="text-sm text-gray-400">{applications.length} record{applications.length !== 1 ? 's' : ''}</span>
                            </div>

                            {applications.length === 0 ? (
                                <div className="py-16 text-center">
                                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <p className="text-gray-400 text-sm">No applications found for this filter.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="bg-gray-50 text-left">
                                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applicant</th>
                                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">State</th>
                                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank</th>
                                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employment</th>
                                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {applications.map((app, idx) => (
                                                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="px-5 py-3 text-xs text-gray-400">{idx + 1}</td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            {app.passport_photograph_path ? (
                                                                <img
                                                                    src={`/storage/${app.passport_photograph_path}`}
                                                                    alt={app.full_name}
                                                                    className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 flex-shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                                    <span className="text-blue-600 text-xs font-bold">
                                                                        {app.full_name?.charAt(0)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{app.full_name}</p>
                                                                <p className="text-xs text-gray-400">{app.email_address}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <p className="text-sm text-gray-600 whitespace-nowrap">{app.calling_phone_number}</p>
                                                        <p className="text-xs text-gray-400">{app.browsing_network} · {app.browsing_number}</p>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className="inline-flex px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg whitespace-nowrap">
                                                            {app.state_of_residence}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <p className="text-sm text-gray-600 whitespace-nowrap">{app.bank_name}</p>
                                                        <p className="text-xs text-gray-400">{app.account_number}</p>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                                                            app.employment_status === 'Employed'
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : app.employment_status === 'Self-employed'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {app.employment_status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                        {new Date(app.created_at).toLocaleDateString('en-GB', {
                                                            day: '2-digit', month: 'short', year: 'numeric'
                                                        })}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <Link
                                                            href={route('ngo-contract-applications.show', app.id)}
                                                            className="text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
                                                        >
                                                            View →
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
