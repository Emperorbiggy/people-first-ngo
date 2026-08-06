import { useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function AccreditationOfficers({ officers = [] }) {
    const { flash } = usePage().props;
    const [revealed, setRevealed] = useState({});

    const { data, setData, post, processing, errors, reset } = useForm({
        full_name: '',
        calling_phone_number: '',
        login_email: '',
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.accreditation-officers.store'), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const toggle = (officer) => {
        router.post(route('admin.accreditation-officers.toggle', officer.id), {}, { preserveScroll: true });
    };

    const remove = (officer) => {
        if (!confirm(`Remove ${officer.full_name}? They will no longer be able to sign in.`)) return;
        router.delete(route('admin.accreditation-officers.destroy', officer.id), { preserveScroll: true });
    };

    return (
        <AdminLayout title="Accreditation Officers">
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Accreditation Officers</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Accounts that can do one thing: accredit APO officers. They sign in at the databoy login and land straight
                        on the APO accreditation page — no applications, no party agents, nothing else.
                    </p>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}

                <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-bold text-gray-700 mb-4">Create an officer</h2>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
                            <input type="text" value={data.full_name} onChange={(e) => setData('full_name', e.target.value)}
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
                            <input type="tel" value={data.calling_phone_number} onChange={(e) => setData('calling_phone_number', e.target.value)}
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            {errors.calling_phone_number && <p className="text-xs text-red-600 mt-1">{errors.calling_phone_number}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Login Email *</label>
                            <input type="email" value={data.login_email} onChange={(e) => setData('login_email', e.target.value)}
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            {errors.login_email && <p className="text-xs text-red-600 mt-1">{errors.login_email}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password *</label>
                            <input type="text" value={data.password} onChange={(e) => setData('password', e.target.value)}
                                placeholder="At least 6 characters"
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                        </div>
                    </div>

                    <button type="submit" disabled={processing}
                        className="mt-4 px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-xl transition">
                        {processing ? 'Creating…' : 'Create Officer'}
                    </button>
                </form>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {officers.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">No accreditation officers yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['#', 'Name', 'Login Email', 'Password', 'Phone', 'Status', 'Actions'].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {officers.map((o, i) => (
                                        <tr key={o.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{o.full_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{o.login_email}</td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <button type="button" onClick={() => setRevealed((r) => ({ ...r, [o.id]: !r[o.id] }))}
                                                    className="font-mono text-xs text-gray-600 hover:text-violet-600 transition">
                                                    {revealed[o.id] ? (o.login_password_plain ?? '—') : '••••••••'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{o.calling_phone_number ?? '—'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${
                                                    o.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {o.is_active ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex gap-1.5">
                                                    <button onClick={() => toggle(o)}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                                                        {o.is_active ? 'Suspend' : 'Activate'}
                                                    </button>
                                                    <button onClick={() => remove(o)}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                                                        Remove
                                                    </button>
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
