import { useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

function Badge({ status, fallback }) {
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

/** One numbered step in the batch pipeline. */
function Step({ n, title, detail, done, blocked, action, busy, tone = 'indigo' }) {
    const tones = {
        indigo:  'text-indigo-700 bg-indigo-50 hover:bg-indigo-100',
        amber:   'text-amber-700 bg-amber-50 hover:bg-amber-100',
        violet:  'text-violet-700 bg-violet-50 hover:bg-violet-100',
        emerald: 'text-white bg-emerald-600 hover:bg-emerald-700',
    };

    return (
        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-gray-50 first:border-t-0 pt-3 first:pt-0">
            <div className="flex items-start gap-3 min-w-0">
                <span className={`shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                    {done ? '✓' : n}
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
                </div>
            </div>
            <button onClick={action.onClick} disabled={busy || blocked}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition whitespace-nowrap disabled:opacity-40 ${tones[tone]}`}>
                {busy ? 'Working…' : action.label}
            </button>
        </div>
    );
}

export default function BulkTransferImport({ batches = [], selectedId = null, rows = [] }) {
    const { flash, errors } = usePage().props;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [batchName, setBatchName] = useState('');
    const [busy, setBusy] = useState(null);
    const fileRef = useRef(null);

    const batch = batches.find((b) => b.id === selectedId) ?? null;

    const filtered = useMemo(() => {
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

        return rows.filter((r) => {
            if (filter === 'ready' && !r.recipient_code) return false;
            if (filter === 'no_recipient' && r.recipient_code) return false;
            if (filter === 'paid' && !r.paid) return false;
            if (filter === 'unpaid' && r.paid) return false;
            if (terms.length === 0) return true;

            const hay = [r.full_name, r.bank_name, r.account_number, r.account_name, r.duty_post, r.source_identity, r.remark]
                .filter(Boolean).join(' ').toLowerCase();

            return terms.every((t) => hay.includes(t));
        });
    }, [rows, search, filter]);

    const upload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy('import');
        router.post(route('admin.bulk-transfer-import.import'), { file, name: batchName }, {
            forceFormData: true,
            onFinish: () => { setBusy(null); setBatchName(''); if (fileRef.current) fileRef.current.value = ''; },
        });
    };

    const step = (name, confirmText) => {
        if (confirmText && !confirm(confirmText)) return;
        setBusy(name);
        router.post(route(name, batch.id), {}, { preserveScroll: true, onFinish: () => setBusy(null) });
    };

    const payable = rows.filter((r) => !r.paid && r.recipient_code && r.amount > 0);
    const payableTotal = payable.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return (
        <AdminLayout title="Import Bulk Transfer">
            <div className="max-w-7xl mx-auto space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Import Bulk Transfer</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Each import is its own batch — match bank codes, create recipients, then send that batch only.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="text" value={batchName} onChange={(e) => setBatchName(e.target.value)}
                            placeholder="Batch name (optional)"
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <input ref={fileRef} type="file" className="hidden" accept=".csv,.txt,.xlsx,.xls,.ods" onChange={upload} />
                        <button onClick={() => fileRef.current?.click()} disabled={busy === 'import'}
                            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl transition">
                            {busy === 'import' ? 'Importing…' : 'New Import'}
                        </button>
                    </div>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}
                {errors?.file && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errors.file}</div>}

                {batches.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                        <p className="text-sm text-gray-400">No batches yet.</p>
                        <button onClick={() => fileRef.current?.click()} className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                            Import your first list →
                        </button>
                        <p className="mt-4 text-xs text-gray-400 max-w-lg mx-auto">
                            Columns: <span className="font-mono">Full Name</span>, <span className="font-mono">Gender/Sex</span>,
                            {' '}<span className="font-mono">Account Number</span>, <span className="font-mono">Bank Name</span>,
                            {' '}<span className="font-mono">Duty Post</span>, <span className="font-mono">Source Identity</span>,
                            {' '}<span className="font-mono">Amount</span>, <span className="font-mono">Account Name</span>.
                            Bank Code and Remark are optional.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Batch picker */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2.5">Batches</p>
                            <div className="flex gap-2.5 overflow-x-auto pb-1">
                                {batches.map((b) => (
                                    <button key={b.id}
                                        onClick={() => router.get(route('admin.bulk-transfer-import'), { batch: b.id }, { preserveScroll: true })}
                                        className={`shrink-0 text-left rounded-2xl border-2 px-4 py-3 transition min-w-[220px] ${
                                            b.id === selectedId ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}>
                                        <p className="text-xs font-mono font-bold text-indigo-700">{b.reference}</p>
                                        <p className="text-sm font-semibold text-gray-800 truncate">{b.name}</p>
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            {b.total} row{b.total === 1 ? '' : 's'} · {naira(b.total_amount)}
                                        </p>
                                        <p className="text-[11px] mt-0.5">
                                            <span className="text-emerald-600 font-semibold">{b.paid} paid</span>
                                            <span className="text-gray-400"> · {b.unpaid} unpaid</span>
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {batch && (
                            <>
                                {/* The four steps for this batch */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3 flex-wrap pb-1">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">
                                                <span className="font-mono text-indigo-700">{batch.reference}</span> · {batch.name}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {batch.total} rows · {batch.with_recipient} with recipient · {batch.paid} paid · {naira(batch.paid_amount)} disbursed
                                            </p>
                                        </div>
                                        {batch.paid === 0 && (
                                            <button
                                                onClick={() => { if (confirm(`Delete batch ${batch.reference} and all its rows?`)) router.delete(route('admin.bulk-transfer-import.destroy-batch', batch.id)); }}
                                                className="text-xs font-semibold text-red-500 hover:text-red-700 transition">
                                                Delete batch
                                            </button>
                                        )}
                                    </div>

                                    <Step
                                        n={2} tone="amber"
                                        title="Match Bank Codes"
                                        detail={batch.missing_code > 0
                                            ? `${batch.missing_code} row(s) in this batch have no bank code.`
                                            : 'Every row already has a bank code.'}
                                        done={batch.missing_code === 0}
                                        blocked={batch.missing_code === 0}
                                        busy={busy === 'admin.bulk-transfer-import.match-bank-codes'}
                                        action={{ label: 'Match Bank Codes', onClick: () => step('admin.bulk-transfer-import.match-bank-codes') }}
                                    />

                                    <Step
                                        n={3} tone="violet"
                                        title="Create Recipients"
                                        detail={`${batch.with_recipient} of ${batch.total} have a Paystack recipient.`}
                                        done={batch.with_recipient === batch.total && batch.total > 0}
                                        blocked={batch.with_recipient === batch.total}
                                        busy={busy === 'admin.bulk-transfer-import.generate-recipients'}
                                        action={{ label: 'Create Recipients', onClick: () => step('admin.bulk-transfer-import.generate-recipients') }}
                                    />

                                    <Step
                                        n={4} tone="emerald"
                                        title="Send Bulk Transfer"
                                        detail={payable.length > 0
                                            ? `${payable.length} ready to pay · ${naira(payableTotal)} total. Each row is paid its own amount.`
                                            : 'Nothing in this batch is ready to pay.'}
                                        done={batch.total > 0 && batch.paid === batch.total}
                                        blocked={payable.length === 0}
                                        busy={busy === 'admin.bulk-transfer-import.send'}
                                        action={{
                                            label: `Send ${naira(payableTotal)}`,
                                            onClick: () => step(
                                                'admin.bulk-transfer-import.send',
                                                `Send ${naira(payableTotal)} across ${payable.length} recipient(s) in ${batch.reference}?\n\nEach is paid their own amount from the sheet. This moves real money.`
                                            ),
                                        }}
                                    />
                                </div>

                                {/* Rows */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="p-4 flex gap-3 flex-wrap items-center border-b border-gray-50">
                                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search name, bank, account, duty post…"
                                            className="flex-1 min-w-[200px] px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                        <div className="flex gap-1.5 flex-wrap">
                                            {[['all', 'All'], ['ready', 'Ready'], ['no_recipient', 'No recipient'], ['unpaid', 'Unpaid'], ['paid', 'Paid']].map(([f, labelText]) => (
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
                                        <div className="py-16 text-center text-sm text-gray-400">
                                            {rows.length === 0 ? 'This batch has no rows.' : 'No results for this filter.'}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-100">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        {['#', 'Full Name', 'Sex', 'Account No.', 'Bank', 'Code', 'Account Name', 'Duty Post', 'Source Identity', 'Amount', 'Remark', 'Recipient', 'Payment', ''].map((h) => (
                                                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {filtered.map((r, i) => (
                                                        <tr key={r.id} className={`transition ${r.paid ? 'bg-emerald-50/30' : 'hover:bg-gray-50'}`}>
                                                            <td className="px-3 py-3 text-xs text-gray-400">{i + 1}</td>
                                                            <td className="px-3 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{r.full_name}</td>
                                                            <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{r.gender ?? '—'}</td>
                                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{r.account_number}</td>
                                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{r.bank_name}</td>
                                                            <td className="px-3 py-3 whitespace-nowrap">
                                                                {r.bank_code
                                                                    ? <span className="text-xs font-mono text-gray-600">{r.bank_code}</span>
                                                                    : <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg">missing</span>}
                                                            </td>
                                                            <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{r.account_name ?? '—'}</td>
                                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{r.duty_post ?? '—'}</td>
                                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{r.source_identity ?? '—'}</td>
                                                            <td className="px-3 py-3 text-sm font-bold text-gray-800 whitespace-nowrap tabular-nums">
                                                                {r.amount > 0 ? naira(r.amount) : <span className="text-amber-600 font-semibold">no amount</span>}
                                                            </td>
                                                            <td className="px-3 py-3 text-sm text-gray-500 max-w-[160px] truncate" title={r.remark}>{r.remark ?? '—'}</td>
                                                            <td className="px-3 py-3 whitespace-nowrap">
                                                                <Badge status={r.recipient_status} fallback="not created" />
                                                                {r.recipient_status === 'failed' && r.recipient_message && (
                                                                    <p className="text-[11px] text-red-400 mt-1 max-w-[180px] truncate" title={r.recipient_message}>{r.recipient_message}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-3 whitespace-nowrap">
                                                                <Badge status={r.payment_status} fallback="not paid" />
                                                                {r.payment_status === 'failed' && r.payment_message && (
                                                                    <p className="text-[11px] text-red-400 mt-1 max-w-[180px] truncate" title={r.payment_message}>{r.payment_message}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-3 whitespace-nowrap">
                                                                {!r.paid && r.recipient_code && r.amount > 0 && (
                                                                    <button
                                                                        onClick={() => { if (confirm(`Send ${naira(r.amount)} to ${r.full_name}?`)) { setBusy(`pay-${r.id}`); router.post(route('admin.bulk-transfer-import.pay', r.id), {}, { preserveScroll: true, onFinish: () => setBusy(null) }); } }}
                                                                        disabled={busy === `pay-${r.id}`}
                                                                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition">
                                                                        Pay
                                                                    </button>
                                                                )}
                                                                {!r.paid && (
                                                                    <button
                                                                        onClick={() => { if (confirm(`Remove ${r.full_name} from this batch?`)) router.delete(route('admin.bulk-transfer-import.destroy', r.id), { preserveScroll: true }); }}
                                                                        className="ml-2 text-xs font-semibold text-red-500 hover:text-red-700 transition">
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
                                            Showing {filtered.length} of {rows.length} in {batch.reference}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
