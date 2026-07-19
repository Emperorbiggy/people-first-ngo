import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function TransportFares({ lgas = [] }) {
    const { flash } = usePage().props;
    const [amounts, setAmounts] = useState(() => Object.fromEntries(lgas.map((l) => [l.id, l.amount])));
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const filtered = search.trim()
        ? lgas.filter((l) => {
            const q = search.toLowerCase();
            return l.name?.toLowerCase().includes(q) || l.state?.toLowerCase().includes(q);
        })
        : lgas;

    const setAmount = (id, value) => setAmounts((prev) => ({ ...prev, [id]: value }));

    const save = () => {
        setSaving(true);
        const fares = lgas.map((l) => ({ lga_id: l.id, amount: amounts[l.id] || 0 }));
        router.post(route('admin.transport-fares.update'), { fares }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };

    return (
        <AdminLayout title="Transport Fares">
            <div className="max-w-4xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Transport Fares</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Set the transport fare paid per LGA. This is added to the general accreditation amount when an applicant is checked out and accredited.</p>
                </div>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                        {flash.success}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">LGAs</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {lgas.length} LGA{lgas.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by LGA or state…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                            />
                        </div>
                    </div>

                    {lgas.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">No LGAs found. Import geo data first.</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No LGAs match that search.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['LGA', 'State', 'Transport Fare'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((lga) => (
                                        <tr key={lga.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{lga.name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{lga.state ?? '—'}</td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="relative w-36">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₦</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={amounts[lga.id] ?? 0}
                                                        onChange={(e) => setAmount(lga.id, e.target.value)}
                                                        className="w-full rounded-xl border border-gray-200 pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {lgas.length > 0 && (
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
                    >
                        {saving ? 'Saving…' : 'Save All Fares'}
                    </button>
                )}

            </div>
        </AdminLayout>
    );
}
