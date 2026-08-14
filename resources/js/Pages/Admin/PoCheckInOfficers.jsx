import { useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function PoCheckInOfficers({ officers = [], lgas = [] }) {
    const { flash } = usePage().props;
    const [showPasswords, setShowPasswords] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        full_name: '', calling_phone_number: '', login_email: '', password: '', lga_id: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.po-checkin-officers.store'), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const field = 'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500';

    return (
        <AdminLayout title="Check-In Officers">
            <div className="max-w-5xl mx-auto space-y-5">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">APO/PO Check-In Officers</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Each login sees only its own LGA's roster. Checking an officer in pays them immediately.
                    </p>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}

                <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <p className="text-sm font-bold text-gray-800">Create a check-in officer</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
                            <input type="text" value={data.full_name} onChange={(e) => setData('full_name', e.target.value)} className={field} />
                            {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">LGA</label>
                            <select value={data.lga_id} onChange={(e) => setData('lga_id', e.target.value)} className={field}>
                                <option value="">All LGAs — statewide login</option>
                                {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            {errors.lga_id
                                ? <p className="mt-1 text-xs text-red-600">{errors.lga_id}</p>
                                : <p className="mt-1 text-xs text-gray-400">
                                    {data.lga_id
                                        ? 'Sees and checks in only this LGA.'
                                        : 'Sees the whole roster and can check in anyone, in any LGA.'}
                                  </p>}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
                            <input type="tel" value={data.calling_phone_number} onChange={(e) => setData('calling_phone_number', e.target.value)} className={field} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Login Email</label>
                            <input type="email" value={data.login_email} onChange={(e) => setData('login_email', e.target.value)} className={field} />
                            {errors.login_email && <p className="mt-1 text-xs text-red-600">{errors.login_email}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                            <input type="text" value={data.password} onChange={(e) => setData('password', e.target.value)}
                                placeholder="At least 6 characters" className={field} />
                            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                        </div>
                    </div>

                    <button type="submit" disabled={processing}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl transition">
                        {processing ? 'Creating…' : 'Create Login'}
                    </button>

                    <p className="text-xs text-gray-400">
                        They sign in at <span className="font-mono">/databoy/login</span> and land straight on their LGA's check-in list.
                    </p>
                </form>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-800">{officers.length} check-in officer(s)</p>
                        <button onClick={() => setShowPasswords(!showPasswords)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                            {showPasswords ? 'Hide passwords' : 'Show passwords'}
                        </button>
                    </div>

                    {officers.length === 0 ? (
                        <div className="py-12 text-center text-sm text-gray-400">No check-in officers yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Name', 'LGA', 'Roster', 'Checked In', 'Email', 'Password', 'Status', ''].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {officers.map((o) => (
                                        <tr key={o.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{o.full_name}</td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                {o.all_lgas
                                                    ? <span className="inline-flex px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-lg">All LGAs</span>
                                                    : <span className="text-gray-600">{o.lga ?? '—'}</span>}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {o.roster_count > 0
                                                    ? <span className="text-sm text-gray-700">{o.roster_count}</span>
                                                    : <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg" title="No roster rows match this LGA name — check the spelling in the imported sheet">0 — check LGA name</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-emerald-700 font-semibold whitespace-nowrap">{o.checked_in_count}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{o.login_email}</td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                {showPasswords
                                                    ? <span className="font-mono text-gray-700">{o.login_password_plain}</span>
                                                    : <span className="text-gray-300">••••••••</span>}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-lg ${
                                                    o.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {o.is_active ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <button onClick={() => router.post(route('admin.po-checkin-officers.toggle', o.id), {}, { preserveScroll: true })}
                                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                                                    {o.is_active ? 'Suspend' : 'Restore'}
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm(`Remove ${o.full_name}'s login?`)) router.delete(route('admin.po-checkin-officers.destroy', o.id), { preserveScroll: true }); }}
                                                    className="ml-3 text-xs font-semibold text-red-500 hover:text-red-700">
                                                    Delete
                                                </button>
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
