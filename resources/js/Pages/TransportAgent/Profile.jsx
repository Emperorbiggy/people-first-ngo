import { useForm } from '@inertiajs/react';
import TransportAgentLayout from '@/Layouts/TransportAgentLayout';

const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition';

const lockedClass = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-600';

function Field({ label, error, children, hint }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
            {children}
            {hint && !error && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

function formatDate(value) {
    if (!value) return '—';

    return new Date(value).toLocaleString('en-NG', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

export default function Profile({ agent, stats }) {
    const details = useForm({
        full_name: agent.full_name || '',
        whatsapp_number: agent.whatsapp_number || '',
        email: agent.email || '',
        address: agent.address || '',
    });

    const password = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const saveDetails = (e) => {
        e.preventDefault();
        details.put(route('transport-agent.profile.update'), { preserveScroll: true });
    };

    const savePassword = (e) => {
        e.preventDefault();
        password.put(route('transport-agent.profile.password'), {
            preserveScroll: true,
            onSuccess: () => password.reset(),
        });
    };

    return (
        <TransportAgentLayout title="My Profile">
            <div className="max-w-3xl mx-auto space-y-5">
                <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl p-5 text-white shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold shrink-0">
                            {(agent.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-lg leading-tight truncate">{agent.full_name}</p>
                            <p className="text-amber-100 text-sm tabular-nums">{agent.phone_number}</p>
                            <p className="text-amber-200 text-xs mt-0.5">{agent.lga_name} LGA · Transport Agent</p>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white/10 rounded-xl py-2.5">
                            <p className="text-lg font-bold tabular-nums">{stats.total.toLocaleString()}</p>
                            <p className="text-[11px] text-amber-100">Vehicles</p>
                        </div>
                        <div className="bg-white/10 rounded-xl py-2.5">
                            <p className="text-[11px] text-amber-100 mt-1">Joined</p>
                            <p className="text-xs font-medium">
                                {agent.registered_at
                                    ? new Date(agent.registered_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : '—'}
                            </p>
                        </div>
                        <div className="bg-white/10 rounded-xl py-2.5">
                            <p className="text-[11px] text-amber-100 mt-1">Last login</p>
                            <p className="text-xs font-medium">
                                {agent.last_login_at
                                    ? new Date(agent.last_login_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
                                    : '—'}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={saveDetails} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800 text-sm">My details</h2>
                    </div>

                    <div className="p-5 grid sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <Field label="Full name" error={details.errors.full_name}>
                                <input type="text" value={details.data.full_name}
                                    onChange={(e) => details.setData('full_name', e.target.value)} className={inputClass} />
                            </Field>
                        </div>

                        <Field label="Phone number" hint="Your login ID — contact the admin to change it">
                            <input type="text" value={agent.phone_number} readOnly className={`${lockedClass} tabular-nums`} />
                        </Field>

                        <Field label="WhatsApp number" error={details.errors.whatsapp_number}>
                            <input type="tel" inputMode="numeric" maxLength={11} value={details.data.whatsapp_number}
                                onChange={(e) => details.setData('whatsapp_number', e.target.value.replace(/\D/g, '').slice(0, 11))}
                                className={`${inputClass} tabular-nums`} />
                        </Field>

                        <Field label="Email address" error={details.errors.email}>
                            <input type="email" value={details.data.email}
                                onChange={(e) => details.setData('email', e.target.value)} className={inputClass} />
                        </Field>

                        <Field label="Gender">
                            <input type="text" value={agent.gender || '—'} readOnly className={`${lockedClass} capitalize`} />
                        </Field>

                        <div className="sm:col-span-2">
                            <Field label="Address" error={details.errors.address}>
                                <input type="text" value={details.data.address}
                                    onChange={(e) => details.setData('address', e.target.value)} className={inputClass} />
                            </Field>
                        </div>

                        <div className="sm:col-span-2">
                            <button type="submit" disabled={details.processing}
                                className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition">
                                {details.processing ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </div>
                </form>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800 text-sm">Payment details</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            These cannot be changed here — contact the admin if anything is wrong.
                        </p>
                    </div>

                    <div className="p-5 grid sm:grid-cols-2 gap-4">
                        <Field label="Bank">
                            <input type="text" value={agent.bank_name || '—'} readOnly className={lockedClass} />
                        </Field>
                        <Field label="Account number">
                            <input type="text" value={agent.account_number || '—'} readOnly className={`${lockedClass} tabular-nums`} />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field label="Account name">
                                <input type="text" value={agent.bank_account_name || '—'} readOnly className={lockedClass} />
                            </Field>
                        </div>
                        <div className="sm:col-span-2">
                            <Field label="Local government area">
                                <input type="text" value={agent.lga_name || '—'} readOnly className={lockedClass} />
                            </Field>
                        </div>
                    </div>
                </div>

                <form onSubmit={savePassword} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800 text-sm">Change password</h2>
                    </div>

                    <div className="p-5 space-y-4">
                        <Field label="Current password" error={password.errors.current_password}>
                            <input type="password" value={password.data.current_password}
                                onChange={(e) => password.setData('current_password', e.target.value)} className={inputClass} />
                        </Field>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="New password" error={password.errors.password} hint="At least 6 characters">
                                <input type="password" value={password.data.password}
                                    onChange={(e) => password.setData('password', e.target.value)} className={inputClass} />
                            </Field>

                            <Field label="Confirm new password">
                                <input type="password" value={password.data.password_confirmation}
                                    onChange={(e) => password.setData('password_confirmation', e.target.value)} className={inputClass} />
                            </Field>
                        </div>

                        <button type="submit" disabled={password.processing}
                            className="w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition">
                            {password.processing ? 'Updating…' : 'Update password'}
                        </button>
                    </div>
                </form>

                <p className="text-center text-xs text-gray-400 pb-2">
                    Account created {formatDate(agent.registered_at)}
                </p>
            </div>
        </TransportAgentLayout>
    );
}
