import { useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

function Stat({ label, value, tone = 'gray' }) {
    const tones = {
        gray:   'bg-gray-50 text-gray-800',
        green:  'bg-emerald-50 text-emerald-700',
        amber:  'bg-amber-50 text-amber-700',
        red:    'bg-red-50 text-red-700',
        violet: 'bg-violet-50 text-violet-700',
    };
    return (
        <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] font-semibold uppercase opacity-70 mt-0.5">{label}</p>
        </div>
    );
}

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

export default function BulkTransferImport({ rows = [], stats }) {
    const { flash, errors } = usePage().props;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [amount, setAmount] = useState('');
    const [busy, setBusy] = useState(null);
    const fileRef = useRef(null);

    const filtered = useMemo(() => {
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

        return rows.filter((r) => {
            if (filter === 'ready' && r.recipient_status !== 'success') return false;
            if (filter === 'failed' && r.recipient_status !== 'failed') return false;
            if (filter === 'paid' && !r.paid) return false;
            if (filter === 'unpaid' && r.paid) return false;
            if (terms.length === 0) return true;

            const hay = [r.full_name, r.bank_name, r.account_number, r.account_name]
                .filter(Boolean).join(' ').toLowerCase();

            return terms.every((t) => hay.includes(t));
        });
    }, [rows, search, filter]);

    const upload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy('import');
        router.post(route('admin.bulk-transfer-import.import'), { file }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => { setBusy(null); if (fileRef.current) fileRef.current.value = ''; },
        });
    };

    const value = Number(amount) || 0;
    const payableCount = stats.unpaid && stats.with_recipient
        ? rows.filter((r) => !r.paid && r.recipient_status === 'success').length
        : 0;

    const sendAll = () => {
        if (value <= 0) return;
        if (!confirm(
            `Send ${naira(value)} to each of the ${payableCount} ready, unpaid recipient(s)?\n\n` +
            `Total: ${naira(value * payableCount)}\n\nThis moves real money.`
        )) return;

        setBusy('send');
        router.post(route('admin.bulk-transfer-import.send'), { amount: value }, {
            preserveScroll: true,
            onFinish: () => setBusy(null),
        });
    };

    const payOne = (row) => {
        if (value <= 0) {
            alert('Enter the amount first.');
            return;
        }
        if (!confirm(`Send ${naira(value)} to ${row.full_name}?`)) return;

        setBusy(`pay-${row.id}`);
        router.post(route('admin.bulk-transfer-import.pay', row.id), { amount: value }, {
            preserveScroll: true,
            onFinish: () => setBusy(null),
        });
    };

    const simplePost = (name) => {
        setBusy(name);
        router.post(route(name), {}, { preserveScroll: true, onFinish: () => setBusy(null) });
    };

    return (
        <AdminLayout title="Import Bulk Transfer">
            <div className="max-w-7xl mx-auto space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Import Bulk Transfer</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Import a list, recipients are created automatically, then send everyone the same amount.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input ref={fileRef} type="file" className="hidden" accept=".csv,.txt,.xlsx,.xls,.ods" onChange={upload} />
                        <button onClick={() => fileRef.current?.click()} disabled={busy === 'import'}
                            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl transition">
                            {busy === 'import' ? 'Importing…' : 'Import List'}
                        </button>
                    </div>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}
                {errors?.file && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errors.file}</div>}
                {errors?.amount && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errors.amount}</div>}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Stat label="Imported" value={stats.total} />
                    <Stat label="Ready" value={stats.with_recipient} tone="violet" />
                    <Stat label="Recipient Failed" value={stats.failed_recipient} tone="red" />
                    <Stat label="Paid" value={stats.paid} tone="green" />
                    <Stat label="Unpaid" value={stats.unpaid} tone="amber" />
                    <Stat label="Disbursed" value={naira(stats.amount_paid)} tone="green" />
                </div>

                {/* Amount + send */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <div className="flex items-end gap-3 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Amount per recipient</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₦</span>
                                <input
                                    type="number" min="1" step="0.01" value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-7 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                        <div className="text-sm text-gray-600">
                            <p>{payableCount} ready &amp; unpaid</p>
                            <p className="font-bold text-gray-800">Total {naira(value * payableCount)}</p>
                        </div>
                        <button onClick={sendAll} disabled={busy === 'send' || value <= 0 || payableCount === 0}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                            {busy === 'send' ? 'Queueing…' : 'Send Bulk Transfer'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400">
                        Each recipient can only ever be paid once — enforced by the database, so a repeated send never double-pays.
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 flex gap-3 flex-wrap items-center border-b border-gray-50">
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, bank, account…"
                            className="flex-1 min-w-[200px] px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <div className="flex gap-1.5 flex-wrap">
                            {[['all', 'All'], ['ready', 'Ready'], ['failed', 'Recipient failed'], ['unpaid', 'Unpaid'], ['paid', 'Paid']].map(([f, labelText]) => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-3 py-2.5 text-xs font-semibold rounded-lg transition ${
                                        filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {labelText}
                                </button>
                            ))}
                        </div>
                        {stats.failed_recipient + stats.pending_recipient > 0 && (
                            <button onClick={() => simplePost('admin.bulk-transfer-import.retry-recipients')} disabled={busy === 'admin.bulk-transfer-import.retry-recipients'}
                                className="px-3 py-2.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-40 rounded-lg transition">
                                Retry recipients
                            </button>
                        )}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-sm text-gray-400">
                                {rows.length === 0 ? 'Nothing imported yet.' : 'No results for this filter.'}
                            </p>
                            {rows.length === 0 && (
                                <>
                                    <button onClick={() => fileRef.current?.click()} className="mt-3 block mx-auto text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                                        Import a list →
                                    </button>
                                    <p className="mt-4 text-xs text-gray-400">
                                        Columns: <span className="font-mono">Full Name</span>, <span className="font-mono">Bank Name</span>,
                                        {' '}<span className="font-mono">Bank Code</span> (optional), <span className="font-mono">Account Number</span>,
                                        {' '}<span className="font-mono">Account Name</span>
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['#', 'Full Name', 'Bank', 'Code', 'Account No.', 'Account Name', 'Recipient Code', 'Recipient', 'Payment', ''].map((h) => (
                                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((r, i) => (
                                        <tr key={r.id} className={`transition ${r.paid ? 'bg-emerald-50/30' : 'hover:bg-gray-50'}`}>
                                            <td className="px-3 py-3 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{r.full_name}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{r.bank_name}</td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {r.bank_code
                                                    ? <span className="text-xs font-mono text-gray-600">{r.bank_code}</span>
                                                    : <span className="text-xs text-gray-400">—</span>}
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{r.account_number}</td>
                                            <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{r.account_name ?? '—'}</td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {r.recipient_code
                                                    ? <span className="text-[11px] font-mono text-gray-500">{r.recipient_code}</span>
                                                    : <span className="text-xs text-gray-400">—</span>}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <Badge status={r.recipient_status} fallback="queued" />
                                                {r.recipient_status === 'failed' && r.recipient_message && (
                                                    <p className="text-[11px] text-red-400 mt-1 max-w-[200px] truncate" title={r.recipient_message}>{r.recipient_message}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <Badge status={r.payment_status} fallback="not paid" />
                                                {r.paid_amount && <p className="text-[11px] text-gray-500 mt-1">{naira(r.paid_amount)}</p>}
                                                {r.payment_status === 'failed' && r.payment_message && (
                                                    <p className="text-[11px] text-red-400 mt-1 max-w-[200px] truncate" title={r.payment_message}>{r.payment_message}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {!r.paid && r.recipient_status === 'success' && (
                                                    <button onClick={() => payOne(r)} disabled={busy === `pay-${r.id}`}
                                                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition">
                                                        {busy === `pay-${r.id}` ? '…' : 'Pay'}
                                                    </button>
                                                )}
                                                {!r.paid && (
                                                    <button
                                                        onClick={() => { if (confirm(`Remove ${r.full_name}?`)) router.delete(route('admin.bulk-transfer-import.destroy', r.id), { preserveScroll: true }); }}
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
                        <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between gap-3 flex-wrap">
                            <p className="text-xs text-gray-400">Showing {filtered.length} of {rows.length}</p>
                            {stats.unpaid > 0 && (
                                <button
                                    onClick={() => { if (confirm('Remove every unpaid row? Paid rows are kept.')) router.delete(route('admin.bulk-transfer-import.clear-unpaid'), { preserveScroll: true }); }}
                                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition">
                                    Clear unpaid rows
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
