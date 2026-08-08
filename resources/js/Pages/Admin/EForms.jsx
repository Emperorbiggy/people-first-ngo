import { useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

function Stat({ label, value, tone = 'gray' }) {
    const tones = {
        gray:   'bg-gray-50 text-gray-800',
        indigo: 'bg-indigo-50 text-indigo-700',
        pink:   'bg-pink-50 text-pink-700',
        green:  'bg-emerald-50 text-emerald-700',
    };
    return (
        <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] font-semibold uppercase opacity-70 mt-0.5">{label}</p>
        </div>
    );
}

export default function EForms({ submissions = [], lgas = [], stats }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [lga, setLga] = useState('all');
    const [gender, setGender] = useState('all');

    const filtered = useMemo(() => {
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

        return submissions.filter((s) => {
            if (lga !== 'all' && s.lga_of_training !== lga) return false;
            if (gender !== 'all' && s.gender !== gender) return false;
            if (terms.length === 0) return true;

            const haystack = [s.application_id, s.full_name, s.phone_number, s.account_number, s.bank_name, s.lga_of_training]
                .filter(Boolean).join(' ').toLowerCase();

            return terms.every((t) => haystack.includes(t));
        });
    }, [submissions, search, lga, gender]);

    const remove = (s) => {
        if (!confirm(`Delete ${s.full_name}'s e-form submission (${s.application_id})?`)) return;
        router.delete(route('admin.e-forms.destroy', s.id), { preserveScroll: true });
    };

    return (
        <AdminLayout title="E-Form Submissions">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">E-Form Submissions</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Everything submitted through the public e-form.</p>
                    </div>
                    <a
                        href={route('admin.e-forms.export')}
                        className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition whitespace-nowrap flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Excel
                    </a>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Stat label="Submissions" value={stats.total} />
                    <Stat label="Male" value={stats.male} tone="indigo" />
                    <Stat label="Female" value={stats.female} tone="pink" />
                    <Stat label="LGAs Covered" value={stats.lgas} tone="green" />
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 flex gap-3 flex-wrap items-center border-b border-gray-50">
                        <input
                            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, application ID, phone, account…"
                            className="flex-1 min-w-[220px] px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <select value={lga} onChange={(e) => setLga(e.target.value)}
                            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="all">All LGAs</option>
                            {lgas.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <div className="flex gap-1.5">
                            {['all', 'Male', 'Female'].map((g) => (
                                <button key={g} onClick={() => setGender(g)}
                                    className={`px-3 py-2.5 text-xs font-semibold rounded-lg transition ${
                                        gender === g ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {g === 'all' ? 'All' : g}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">
                            {submissions.length === 0 ? 'No e-form submissions yet.' : 'No results for this filter.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['#', 'Application ID', 'Full Name', 'Phone', 'LGA of Training', 'Gender', 'Bank', 'Account No.', 'Submitted', ''].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((s, i) => (
                                        <tr key={s.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-4 py-3 text-sm font-mono font-semibold text-indigo-700 whitespace-nowrap">{s.application_id}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{s.full_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{s.phone_number}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{s.lga_of_training}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-lg ${
                                                    s.gender === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-indigo-100 text-indigo-700'
                                                }`}>
                                                    {s.gender}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{s.bank_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{s.account_number}</td>
                                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <button onClick={() => remove(s)}
                                                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {filtered.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
                            Showing {filtered.length} of {submissions.length} submission{submissions.length === 1 ? '' : 's'}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
