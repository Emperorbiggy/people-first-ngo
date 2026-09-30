import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import TransportAdminLayout from '@/Layouts/TransportAdminLayout';

function Row({ label, value, mono = false }) {
    return (
        <div>
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-sm text-gray-800 ${mono ? 'tabular-nums' : ''}`}>{value || '—'}</p>
        </div>
    );
}

function formatDate(value) {
    if (!value) return '—';

    return new Date(value).toLocaleString('en-NG', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

export default function AgentDetail({ agent, counts, recent = [] }) {
    const [showPassword, setShowPassword] = useState(false);

    const toggleActive = () => {
        const question = agent.is_active
            ? `Suspend ${agent.full_name}? They will be signed out and cannot capture vehicles.`
            : `Restore ${agent.full_name}'s access?`;

        if (confirm(question)) {
            router.post(route('transport-admin.agents.toggle', agent.id), {}, { preserveScroll: true });
        }
    };

    return (
        <TransportAdminLayout title={agent.full_name}>
            <div className="max-w-4xl mx-auto space-y-5">

                <Link href={route('transport-admin.agents')}
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                    ← Back to agents
                </Link>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 flex flex-col sm:flex-row gap-5">
                        {agent.passport_url ? (
                            <img src={agent.passport_url} alt={agent.full_name}
                                className="w-28 h-28 rounded-2xl object-cover border border-gray-200 shrink-0" />
                        ) : (
                            <div className="w-28 h-28 rounded-2xl bg-red-50 border-2 border-dashed border-red-200 flex flex-col items-center justify-center shrink-0 text-center px-2">
                                <span className="text-red-500 text-xs font-semibold">No passport</span>
                                <span className="text-red-400 text-[10px] mt-0.5">held at their profile</span>
                            </div>
                        )}

                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{agent.full_name}</h2>
                                    <p className="text-sm text-gray-500">
                                        {agent.stream ?? '—'} · {agent.lga_name ?? '—'}
                                    </p>
                                </div>

                                <button onClick={toggleActive}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                                        agent.is_active
                                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    }`}>
                                    {agent.is_active ? 'Suspend access' : 'Restore access'}
                                </button>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                                <div className="bg-gray-50 rounded-xl py-2.5">
                                    <p className="text-lg font-bold text-gray-900 tabular-nums">{counts.total.toLocaleString()}</p>
                                    <p className="text-[11px] text-gray-500">Vehicles</p>
                                </div>
                                <div className="bg-violet-50 rounded-xl py-2.5">
                                    <p className="text-lg font-bold text-violet-700 tabular-nums">{counts.bike.toLocaleString()}</p>
                                    <p className="text-[11px] text-violet-600">Bike & Maruwa</p>
                                </div>
                                <div className="bg-amber-50 rounded-xl py-2.5">
                                    <p className="text-lg font-bold text-amber-700 tabular-nums">{counts.korope.toLocaleString()}</p>
                                    <p className="text-[11px] text-amber-600">Korope, Bus & Car</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-800 text-sm">Contact & posting</h3>
                        </div>
                        <div className="p-5 grid grid-cols-2 gap-4">
                            <Row label="Phone" value={agent.phone_number} mono />
                            <Row label="WhatsApp" value={agent.whatsapp} mono />
                            <Row label="Browsing data number" value={agent.browsing} mono />
                            <Row label="Email" value={agent.email} />
                            <Row label="Gender" value={agent.gender} />
                            <Row label="LGA" value={agent.lga_name} />
                            <Row label="Zone / Group" value={agent.zone} />
                            <Row label="Branch" value={agent.branch_name} />
                            <div className="col-span-2"><Row label="Address" value={agent.address} /></div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-gray-100">
                                <h3 className="font-semibold text-gray-800 text-sm">Payment details</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                <Row label="Bank" value={agent.bank_name} />
                                <Row label="Account number" value={agent.account_number} mono />
                                <Row label="Account name (verified by the bank)" value={agent.account_name} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-gray-100">
                                <h3 className="font-semibold text-gray-800 text-sm">Sign-in</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                <Row label="Registered" value={formatDate(agent.created_at)} />
                                <Row label="Last login" value={formatDate(agent.last_login_at)} />

                                <div>
                                    <p className="text-xs text-gray-400">Password</p>
                                    {agent.login_password ? (
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-800 tabular-nums tracking-widest">
                                                {showPassword ? agent.login_password : '••••••'}
                                            </span>
                                            <button onClick={() => setShowPassword((v) => !v)}
                                                className="text-xs font-medium text-slate-600 hover:text-slate-900">
                                                {showPassword ? 'Hide' : 'Show'}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">
                                            Changed by the agent — cannot be read back.
                                        </p>
                                    )}
                                    <p className="mt-1 text-[11px] text-gray-400">
                                        Shown once at registration. This is where a locked-out agent gets it again.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800 text-sm">Latest captures</h3>
                        <Link href={route('transport-admin.vehicles', { agent: agent.id })}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900">
                            See all {counts.total.toLocaleString()} →
                        </Link>
                    </div>

                    {recent.length === 0 ? (
                        <p className="px-5 py-10 text-center text-sm text-gray-400">Nothing captured yet.</p>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {recent.map((v) => (
                                <li key={v.id} className="px-5 py-3 flex items-center gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-800 tracking-wide">{v.plate_number}</p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {v.vehicle_type} · {v.owner_name} · {v.owner_phone}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                                        {new Date(v.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

            </div>
        </TransportAdminLayout>
    );
}
