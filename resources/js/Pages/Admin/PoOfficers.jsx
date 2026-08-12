import { useMemo, useRef, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

function Stat({ label, value, tone = 'gray', hint }) {
    const tones = {
        gray:   'bg-gray-50 text-gray-800',
        green:  'bg-emerald-50 text-emerald-700',
        amber:  'bg-amber-50 text-amber-700',
        violet: 'bg-violet-50 text-violet-700',
        red:    'bg-red-50 text-red-700',
    };
    return (
        <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`} title={hint}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] font-semibold uppercase opacity-70 mt-0.5">{label}</p>
        </div>
    );
}

function Badge({ status, fallback = '—' }) {
    if (!status) return <span className="text-xs text-gray-400">{fallback}</span>;

    const tones = {
        success: 'bg-emerald-100 text-emerald-700',
        pending: 'bg-blue-100 text-blue-700',
        failed:  'bg-red-100 text-red-700',
        unknown: 'bg-amber-100 text-amber-700',
    };

    return (
        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-lg capitalize ${tones[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {status === 'unknown' ? 'needs review' : status}
        </span>
    );
}

export default function PoOfficers({ officers = [], stats, amount = 0 }) {
    const { flash, errors } = usePage().props;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [busy, setBusy] = useState(null);
    const fileRef = useRef(null);

    const filtered = useMemo(() => {
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

        return officers.filter((o) => {
            if (filter === 'no_code' && o.bank_code) return false;
            if (filter === 'no_recipient' && o.recipient_status === 'success') return false;
            if (filter === 'paid' && !o.paid) return false;
            if (filter === 'unpaid' && o.paid) return false;
            if (terms.length === 0) return true;

            const hay = [o.full_name, o.phone_number, o.account_number, o.bank_name, o.final_lga, o.final_pu, o.final_ra_ward, o.final_role]
                .filter(Boolean).join(' ').toLowerCase();

            return terms.every((t) => hay.includes(t));
        });
    }, [officers, search, filter]);

    const post = (name, label, confirmText) => {
        if (confirmText && !confirm(confirmText)) return;
        setBusy(name);
        router.post(route(name), {}, { preserveScroll: true, onFinish: () => setBusy(null) });
    };

    const upload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy('import');
        router.post(route('admin.po-officers.import'), { file }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => { setBusy(null); if (fileRef.current) fileRef.current.value = ''; },
        });
    };

    const retry = (o) => {
        setBusy(`retry-${o.id}`);
        router.post(route('admin.po-officers.retry', o.id), {}, { preserveScroll: true, onFinish: () => setBusy(null) });
    };

    const remove = (o) => {
        if (!confirm(`Remove ${o.full_name} from the roster?`)) return;
        router.delete(route('admin.po-officers.destroy', o.id), { preserveScroll: true });
    };

    return (
        <AdminLayout title="APO/PO Officers">
            <div className="max-w-7xl mx-auto space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">APO/PO Officers</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Standalone roster — import, match bank codes, create recipients, then pay.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input ref={fileRef} type="file" className="hidden" accept=".csv,.txt,.xlsx,.xls,.ods" onChange={upload} />
                        <button onClick={() => fileRef.current?.click()} disabled={busy === 'import'}
                            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl transition">
                            {busy === 'import' ? 'Importing…' : 'Import Roster'}
                        </button>
                    </div>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}
                {errors?.file && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errors.file}</div>}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Stat label="On Roster" value={stats.total} />
                    <Stat label="No Bank Code" value={stats.missing_code} tone="amber" />
                    <Stat label="Recipients" value={stats.with_recipient} tone="violet" />
                    <Stat label="Paid" value={stats.paid} tone="green" />
                    <Stat label="Unpaid" value={stats.unpaid} tone="amber" />
                    <Stat label="Disbursed" value={naira(stats.amount_paid)} tone="green" />
                </div>

                {/* The four steps, in the order they must be run */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <p className="text-sm font-bold text-gray-800">2 · Match Bank Codes</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Looks up Paystack's bank list and fills the code for the {stats.missing_code} officer(s) without one.
                            </p>
                        </div>
                        <button onClick={() => post('admin.po-officers.match-bank-codes')} disabled={busy === 'admin.po-officers.match-bank-codes' || stats.missing_code === 0}
                            className="px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                            {busy === 'admin.po-officers.match-bank-codes' ? 'Matching…' : 'Match Bank Codes'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap border-t border-gray-50 pt-3">
                        <div>
                            <p className="text-sm font-bold text-gray-800">3 · Generate Recipients</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Queues a job per officer to create their Paystack transfer recipient, one at a time.
                            </p>
                        </div>
                        <button onClick={() => post('admin.po-officers.generate-recipients')} disabled={busy === 'admin.po-officers.generate-recipients'}
                            className="px-4 py-2 text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                            {busy === 'admin.po-officers.generate-recipients' ? 'Queueing…' : 'Generate Recipients'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap border-t border-gray-50 pt-3">
                        <div>
                            <p className="text-sm font-bold text-gray-800">4 · Send Bulk Transfer</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {amount > 0
                                    ? <>Pays <span className="font-bold text-gray-700">{naira(amount)}</span> to each of the {stats.unpaid} unpaid officer(s) with a recipient.</>
                                    : <span className="text-red-600 font-semibold">Set the APO/PO amount in Settings first.</span>}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href={route('admin.settings')} className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition">
                                Settings →
                            </Link>
                            <button
                                onClick={() => post(
                                    'admin.po-officers.send-bulk-transfer',
                                    null,
                                    `Send ${naira(amount)} to each unpaid officer with a recipient?\n\nThis moves real money. Each officer can only ever be paid once.`
                                )}
                                disabled={busy === 'admin.po-officers.send-bulk-transfer' || amount <= 0}
                                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                                {busy === 'admin.po-officers.send-bulk-transfer' ? 'Queueing…' : 'Send Bulk Transfer'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 flex gap-3 flex-wrap items-center border-b border-gray-50">
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, phone, account, LGA, PU, role…"
                            className="flex-1 min-w-[220px] px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <div className="flex gap-1.5 flex-wrap">
                            {[['all', 'All'], ['no_code', 'No code'], ['no_recipient', 'No recipient'], ['unpaid', 'Unpaid'], ['paid', 'Paid']].map(([f, labelText]) => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-3 py-2.5 text-xs font-semibold rounded-lg transition ${
                                        filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {labelText}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-sm text-gray-400">
                                {officers.length === 0 ? 'No officers on the roster yet.' : 'No results for this filter.'}
                            </p>
                            {officers.length === 0 && (
                                <button onClick={() => fileRef.current?.click()} className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                                    Import a roster →
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['#', 'Surname', 'First Name', 'Other Name', 'Phone', 'Bank', 'Code', 'Account No.', 'Account Name', 'LGA', 'RA/Ward', 'PU', 'Role', 'Recipient', 'Payment', ''].map((h) => (
                                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((o, i) => (
                                        <tr key={o.id} className={`transition ${o.paid ? 'bg-emerald-50/30' : 'hover:bg-gray-50'}`}>
                                            <td className="px-3 py-3 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap uppercase">{o.final_surname}</td>
                                            <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{o.final_first_name}</td>
                                            <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{o.final_other_name ?? '—'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{o.phone_number || '—'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{o.bank_name}</td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {o.bank_code
                                                    ? <span className="text-xs font-mono text-gray-600">{o.bank_code}</span>
                                                    : <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg">missing</span>}
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{o.account_number}</td>
                                            <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{o.account_name ?? '—'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{o.final_lga ?? '—'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{o.final_ra_ward ?? '—'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap max-w-[180px] truncate" title={o.final_pu}>{o.final_pu ?? '—'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{o.final_role ?? '—'}</td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <Badge status={o.recipient_status} />
                                                {o.recipient_status === 'failed' && o.recipient_message && (
                                                    <p className="text-[11px] text-red-400 mt-1 max-w-[180px] truncate" title={o.recipient_message}>{o.recipient_message}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <Badge status={o.payment_status} fallback="not paid" />
                                                {o.payment_status === 'failed' && o.payment_message && (
                                                    <p className="text-[11px] text-red-400 mt-1 max-w-[180px] truncate" title={o.payment_message}>{o.payment_message}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {!o.paid && o.recipient_status === 'success' && (
                                                    <button onClick={() => retry(o)} disabled={busy === `retry-${o.id}`}
                                                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-40 transition">
                                                        {busy === `retry-${o.id}` ? '…' : 'Pay'}
                                                    </button>
                                                )}
                                                {!o.paid && (
                                                    <button onClick={() => remove(o)} className="ml-2 text-xs font-semibold text-red-500 hover:text-red-700 transition">
                                                        Delete
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {filtered.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
                            Showing {filtered.length} of {officers.length} officer{officers.length === 1 ? '' : 's'}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
