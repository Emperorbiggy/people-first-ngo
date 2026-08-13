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
    const preview = flash?.poPreview;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [busy, setBusy] = useState(null);
    const fileRef = useRef(null);

    const filtered = useMemo(() => {
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

        return officers.filter((o) => {
            if (filter === 'no_code' && o.bank_code) return false;
            if (filter === 'no_recipient' && o.recipient_status === 'success') return false;
            if (filter === 'checked_in' && !o.checked_in_at) return false;
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
        // Preview first — nothing is written until it is confirmed.
        router.post(route('admin.po-officers.preview'), { file }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => { setBusy(null); if (fileRef.current) fileRef.current.value = ''; },
        });
    };

    const confirmImport = () => {
        setBusy('confirm');
        router.post(route('admin.po-officers.import'), { token: preview.token }, {
            preserveScroll: true,
            onFinish: () => setBusy(null),
        });
    };

    const cancelImport = () => {
        router.post(route('admin.po-officers.cancel-import'), { token: preview.token }, { preserveScroll: true });
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
                            Standalone roster — import, match bank codes, create recipients. Officers are paid at check-in.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input ref={fileRef} type="file" className="hidden" accept=".csv,.txt,.xlsx,.xls,.ods" onChange={upload} />
                        <button onClick={() => fileRef.current?.click()} disabled={busy === 'import'}
                            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl transition">
                            {busy === 'import' ? 'Reading…' : 'Import Roster'}
                        </button>
                    </div>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}
                {errors?.file && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errors.file}</div>}

                {preview && (
                    <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100">
                            <p className="text-sm font-bold text-indigo-900">Preview — nothing has been imported yet</p>
                            <p className="text-xs text-indigo-700/70 mt-0.5 break-all">{preview.file}</p>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                                    <p className="text-xl font-bold text-gray-800">{preview.total}</p>
                                    <p className="text-[11px] font-semibold uppercase text-gray-400">Rows read</p>
                                </div>
                                <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
                                    <p className="text-xl font-bold text-emerald-700">{preview.new}</p>
                                    <p className="text-[11px] font-semibold uppercase text-emerald-600/70">New</p>
                                </div>
                                <div className="rounded-xl bg-blue-50 px-3 py-2.5">
                                    <p className="text-xl font-bold text-blue-700">{preview.updating}</p>
                                    <p className="text-[11px] font-semibold uppercase text-blue-600/70">Will update</p>
                                </div>
                                <div className="rounded-xl bg-amber-50 px-3 py-2.5">
                                    <p className="text-xl font-bold text-amber-700">{preview.skipped}</p>
                                    <p className="text-[11px] font-semibold uppercase text-amber-600/70">Will skip</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-gray-600 mb-1.5">Columns detected</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(preview.columns ?? {}).map(([field, heading]) => (
                                        <span key={field} className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-600">
                                            <span className="font-semibold text-gray-700">{field}</span> ← {heading}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {preview.sample?.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-gray-600 mb-1.5">First {preview.sample.length} of {preview.ready} importable</p>
                                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                                        <table className="min-w-full text-xs">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {['Surname', 'First', 'Other', 'Phone', 'Bank', 'Code', 'Account', 'Account Name', 'LGA'].map((h) => (
                                                        <th key={h} className="px-2.5 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {preview.sample.map((r, i) => (
                                                    <tr key={i}>
                                                        <td className="px-2.5 py-2 font-semibold text-gray-800 whitespace-nowrap uppercase">{r.final_surname}</td>
                                                        <td className="px-2.5 py-2 text-gray-700 whitespace-nowrap">{r.final_first_name || '—'}</td>
                                                        <td className="px-2.5 py-2 text-gray-500 whitespace-nowrap">{r.final_other_name || '—'}</td>
                                                        <td className="px-2.5 py-2 text-gray-600 whitespace-nowrap tabular-nums">{r.phone_number || '—'}</td>
                                                        <td className="px-2.5 py-2 text-gray-600 whitespace-nowrap">{r.bank_name || '—'}</td>
                                                        <td className="px-2.5 py-2 text-gray-600 whitespace-nowrap">{r.bank_code || '—'}</td>
                                                        <td className="px-2.5 py-2 text-gray-600 whitespace-nowrap tabular-nums">{r.account_number}</td>
                                                        <td className="px-2.5 py-2 text-gray-500 whitespace-nowrap">{r.account_name || '—'}</td>
                                                        <td className="px-2.5 py-2 text-gray-600 whitespace-nowrap">{r.final_lga || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {preview.duplicates > 0 && (
                                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                                    <p className="text-xs font-bold text-amber-900 mb-1.5">
                                        {preview.duplicates} duplicate row(s) will be ignored
                                    </p>
                                    <p className="text-[11px] text-amber-800/80 mb-1.5">
                                        These account numbers appear more than once. The first row for each is imported and the
                                        repeats are dropped — nothing gets overwritten.
                                    </p>
                                    <ul className="text-[11px] text-amber-800/80 space-y-0.5">
                                        {preview.duplicateSample.map((d, i) => (
                                            <li key={i}>
                                                <span className="font-mono">{d.account}</span> — keeping <span className="font-semibold">{d.kept}</span>
                                                {d.skipped !== d.kept && <>, ignoring <span className="font-semibold">{d.skipped}</span></>}
                                            </li>
                                        ))}
                                    </ul>
                                    {preview.duplicates > preview.duplicateSample.length && (
                                        <p className="text-[11px] text-red-700/60 mt-1">…and {preview.duplicates - preview.duplicateSample.length} more.</p>
                                    )}
                                </div>
                            )}

                            {preview.skippedSample?.length > 0 && (
                                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                                    <p className="text-xs font-bold text-amber-900 mb-1.5">
                                        {preview.skipped} row(s) will be skipped
                                    </p>
                                    <ul className="text-[11px] text-amber-800/80 space-y-0.5">
                                        {preview.skippedSample.map((r, i) => (
                                            <li key={i}>{r.name} — {r.reason}</li>
                                        ))}
                                    </ul>
                                    {preview.skipped > preview.skippedSample.length && (
                                        <p className="text-[11px] text-amber-700/60 mt-1">…and {preview.skipped - preview.skippedSample.length} more.</p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2.5 pt-1">
                                <button onClick={cancelImport}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                                    Cancel
                                </button>
                                <button onClick={confirmImport} disabled={busy === 'confirm' || preview.ready === 0}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition">
                                    {busy === 'confirm' ? 'Importing…' : `Import ${preview.ready} officer(s)`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Stat label="On Roster" value={stats.total} />
                    <Stat label="No Bank Code" value={stats.missing_code} tone="amber" />
                    <Stat label="Recipients" value={stats.with_recipient} tone="violet" />
                    <Stat label="Checked In" value={stats.checked_in} tone="violet" />
                    <Stat label="Paid" value={stats.paid} tone="green" />
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
                            <p className="text-sm font-bold text-gray-800">4 · Payment happens at check-in</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {amount > 0
                                    ? <>Check-in officers pay <span className="font-bold text-gray-700">{naira(amount)}</span> as they confirm each officer present, from their own LGA list.</>
                                    : <span className="text-red-600 font-semibold">Set the APO/PO amount in Settings — check-ins cannot pay without it.</span>}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href={route('admin.settings')} className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition">
                                Settings →
                            </Link>
                            <button onClick={() => post('admin.po-officers.refresh-payment-statuses')}
                                disabled={busy === 'admin.po-officers.refresh-payment-statuses'}
                                title="Paystack settles transfers asynchronously — this asks it for the current state of anything still pending"
                                className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                                {busy === 'admin.po-officers.refresh-payment-statuses' ? 'Checking…' : 'Refresh Payment Status'}
                            </button>
                            <Link href={route('admin.po-checkin-officers')}
                                className="px-4 py-2 text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition whitespace-nowrap">
                                Check-In Officers
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 flex gap-3 flex-wrap items-center border-b border-gray-50">
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, phone, account, LGA, PU, role…"
                            className="flex-1 min-w-[220px] px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <div className="flex gap-1.5 flex-wrap">
                            {[['all', 'All'], ['no_code', 'No code'], ['no_recipient', 'No recipient'], ['checked_in', 'Checked in'], ['unpaid', 'Unpaid'], ['paid', 'Paid']].map(([f, labelText]) => (
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
                                        {['#', 'Surname', 'First Name', 'Other Name', 'Phone', 'Bank', 'Code', 'Account No.', 'Account Name', 'LGA', 'RA/Ward', 'PU', 'Role', 'Recipient', 'Checked In', 'Payment', ''].map((h) => (
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
                                                {o.checked_in_at ? (
                                                    <div>
                                                        <span className="inline-flex px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">✓</span>
                                                        {o.checked_in_by && <p className="text-[11px] text-gray-400 mt-1 max-w-[120px] truncate" title={o.checked_in_by}>{o.checked_in_by}</p>}
                                                    </div>
                                                ) : <span className="text-xs text-gray-400">—</span>}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <Badge status={o.payment_status} fallback="not paid" />
                                                {o.payment_status === 'failed' && o.payment_message && (
                                                    <p className="text-[11px] text-red-400 mt-1 max-w-[180px] truncate" title={o.payment_message}>{o.payment_message}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {!o.paid && o.checked_in_at && o.recipient_status === 'success' && (
                                                    <button onClick={() => retry(o)} disabled={busy === `retry-${o.id}`}
                                                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-40 transition">
                                                        {busy === `retry-${o.id}` ? '…' : 'Retry Pay'}
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
