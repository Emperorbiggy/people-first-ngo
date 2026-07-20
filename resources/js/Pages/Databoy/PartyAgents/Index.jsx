import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import DataboyLayout from '@/Layouts/DataboyLayout';

export default function Index({ partyAgents = [] }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');

    const filtered = partyAgents.filter((a) => {
        const q = search.toLowerCase();
        return (
            a.full_name?.toLowerCase().includes(q) ||
            a.calling_phone_number?.toLowerCase().includes(q) ||
            a.lga?.name?.toLowerCase().includes(q) ||
            a.ward?.name?.toLowerCase().includes(q)
        );
    });

    return (
        <DataboyLayout title="My Party Agents">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">My Party Agents</h1>
                    <p className="text-sm text-gray-500">{partyAgents.length} total</p>
                </div>
                <Link
                    href={route('databoy.party-agents.create')}
                    className="inline-flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Party Agent
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
                            {partyAgents.length === 0 ? 'No party agents yet. ' : 'No results found. '}
                            <Link href={route('databoy.party-agents.create')} className="text-indigo-600 hover:underline">
                                Add one now →
                            </Link>
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['#', 'Photo', 'Name', 'Phone', 'LGA', 'Ward', 'Polling Unit', 'Date'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((agent, i) => (
                                    <tr key={agent.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-4 py-3">
                                            {agent.passport_photograph_path ? (
                                                <img src={`/storage/${agent.passport_photograph_path}`} alt={agent.full_name}
                                                    className="w-9 h-9 rounded-full object-cover border-2 border-gray-100" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                                                    <span className="text-indigo-600 text-xs font-bold">{agent.full_name?.charAt(0)}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{agent.full_name}</p>
                                            <p className="text-xs text-gray-400">{agent.email_address}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{agent.calling_phone_number}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{agent.lga?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{agent.ward?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{agent.polling_unit?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                            {new Date(agent.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
