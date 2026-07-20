import { useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';

function StatCard({ label, value, color }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}

export default function AccreditationWardStats({ wards = [], summary = {} }) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return wards;
        const q = search.toLowerCase();
        return wards.filter((w) => w.name?.toLowerCase().includes(q) || w.lga?.toLowerCase().includes(q));
    }, [wards, search]);

    return (
        <AdminLayout title="Accreditation by Ward">
            <div className="max-w-6xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Accreditation by Ward</h1>
                    <p className="text-sm text-gray-500 mt-0.5">How many registered applicants have been accredited so far, broken down by ward.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Wards with Applicants" value={summary.total_wards ?? 0} color="text-gray-800" />
                    <StatCard label="Total Applicants" value={summary.total_applicants ?? 0} color="text-indigo-600" />
                    <StatCard label="Total Accredited" value={summary.total_accredited ?? 0} color="text-green-600" />
                    <StatCard label="Overall %" value={`${summary.overall_pct ?? 0}%`} color="text-violet-600" />
                </div>

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
                        <div className="py-16 text-center text-sm text-gray-400">No applicants have been registered to any ward yet.</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No wards match that search.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Ward', 'LGA', 'Applicants', 'Accredited', 'Pending', 'Progress'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((w) => (
                                        <tr key={w.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{w.name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{w.lga ?? '—'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{w.total_applicants}</td>
                                            <td className="px-5 py-3 text-sm font-medium text-green-600 whitespace-nowrap">{w.accredited}</td>
                                            <td className="px-5 py-3 text-sm text-amber-600 whitespace-nowrap">{w.pending}</td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2 w-40">
                                                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                                        <div
                                                            className={`h-full ${w.pct === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                            style={{ width: `${w.pct}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-bold ${w.pct === 100 ? 'text-green-600' : 'text-gray-500'}`}>{w.pct}%</span>
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
