import { useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

function Stat({ label, value, tone = 'gray' }) {
    const tones = {
        gray:   'bg-gray-50 text-gray-800',
        green:  'bg-emerald-50 text-emerald-700',
        amber:  'bg-amber-50 text-amber-700',
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

export default function ApoFinalPayments({ rows = null, stats = {}, filters = {}, narration: defaultNarration = '' }) {
    const { flash, errors } = usePage().props;
    const [search, setSearch] = useState(filters.q ?? '');
    const [narration, setNarration] = useState(defaultNarration);
    const [selected, setSelected] = useState([]);
    const [allMatching, setAllMatching] = useState(false);
    const [busy, setBusy] = useState(null);
    const fileRef = useRef(null);

    const filter = filters.filter ?? 'all';
    const page = rows?.data ?? [];

    const reload = (params) => {
        setSelected([]);
        setAllMatching(false);
        router.get(route('admin.apo-final-payments'), { q: search, filter, ...params },
            { preserveState: true, preserveScroll: true, replace: true });
    };

    const upload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy('import');
        router.post(route('admin.apo-final-payments.import'), { file }, {
            forceFormData: true,
            onFinish: () => { setBusy(null); if (fileRef.current) fileRef.current.value = ''; },
        });
    };

    const post = (name, confirmText) => {
        if (confirmText && !confirm(confirmText)) return;
        setBusy(name);
        router.post(route(name), {}, { preserveScroll: true, onFinish: () => setBusy(null) });
    };

    // Only rows with a recipient and an amount can be ticked.
    const selectableOnPage = page.filter((r) => !r.paid_key && r.recipient_code && r.amount > 0);
    const selectedOnPage = selectableOnPage.filter((r) => selected.includes(r.id));
    const pageAllSelected = selectableOnPage.length > 0 && selectedOnPage.length === selectableOnPage.length;
    const selectedCount = allMatching ? (stats.payable ?? 0) : selected.length;
    const selectedTotal = allMatching
        ? (stats.payable_total ?? 0)
        : page.filter((r) => selected.includes(r.id)).reduce((s, r) => s + Number(r.amount || 0), 0);

    const toggleAll = () => {
        setAllMatching(false);
        setSelected(pageAllSelected
            ? selected.filter((id) => !selectableOnPage.some((r) => r.id === id))
            : [...new Set([...selected, ...selectableOnPage.map((r) => r.id)])]);
    };

    const send = () => {
        if (selectedCount === 0 || !narration.trim()) return;

        if (!confirm(
            `Send ${naira(selectedTotal)} to ${selectedCount} recipient(s)?\n\n`
            + `Recipients will see: "${narration}"\n\n`
            + `Each is paid their own amount from the sheet. This moves real money.`
        )) return;

        setBusy('send');
        router.post(route('admin.apo-final-payments.send'),
            allMatching ? { all: true, narration } : { ids: selected, narration },
            {
                preserveScroll: true,
                onSuccess: () => { setSelected([]); setAllMatching(false); },
                onFinish: () => setBusy(null),
            });
    };

    return (
        <AdminLayout title="APO/PO Final Payment">
            <div className="max-w-7xl mx-auto space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">APO/PO Final Payment</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Import bank details and amounts, create the recipients, then pay. Each row is paid its own amount.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {stats.total > 0 && (
                            <a href={route('admin.apo-final-payments.export')}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                                Export CSV
                            </a>
                        )}
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

                {stats.total === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                        <p className="text-sm text-gray-400">Nothing imported yet.</p>
                        <button onClick={() => fileRef.current?.click()} className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                            Import a list →
                        </button>
                        <p className="mt-4 text-xs text-gray-400">
                            Columns: <span className="font-mono">Bank Name</span>, <span className="font-mono">Bank Code</span>,
                            {' '}<span className="font-mono">Account Number</span>, <span className="font-mono">Account Name</span>,
                            {' '}<span className="font-mono">Amount</span>. Bank Code is matched for you if left blank.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <Stat label="Imported" value={stats.total} />
                            <Stat label="No Bank Code" value={stats.missing_code} tone="amber" />
                            <Stat label="Recipients" value={stats.with_recipient} tone="violet" />
                            <Stat label="Paid" value={stats.paid} tone="green" />
                            <Stat label="Sheet Total" value={naira(stats.total_amount)} />
                            <Stat label="Disbursed" value={naira(stats.paid_amount)} tone="green" />
                        </div>

                        {stats.unsettled > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                                <p className="text-xs text-amber-800">
                                    <span className="font-semibold">{stats.unsettled} transfer(s) still settling.</span> Paystack confirms
                                    asynchronously — check for their real outcome.
                                </p>
                                <button onClick={() => post('admin.apo-final-payments.refresh-statuses')}
                                    disabled={busy === 'admin.apo-final-payments.refresh-statuses'}
                                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 rounded-lg transition whitespace-nowrap">
                                    {busy === 'admin.apo-final-payments.refresh-statuses' ? 'Checking…' : 'Refresh from Paystack'}
                                </button>
                            </div>
                        )}

                        {/* Steps 2 and 3 */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">2 · Create Recipients</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {stats.with_recipient} of {stats.total} ready.
                                        {stats.missing_code > 0 && ` ${stats.missing_code} have no bank code — it is matched from the bank name automatically.`}
                                    </p>
                                </div>
                                <button onClick={() => post('admin.apo-final-payments.generate-recipients')}
                                    disabled={busy === 'admin.apo-final-payments.generate-recipients' || stats.with_recipient === stats.total}
                                    className="px-4 py-2 text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                                    {busy === 'admin.apo-final-payments.generate-recipients' ? 'Queueing…' : 'Create Recipients'}
                                </button>
                            </div>

                            <div className="border-t border-gray-50 pt-3 space-y-2.5">
                                <p className="text-sm font-bold text-gray-800">3 · Pay</p>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">
                                        Payment remark — what the recipient sees on their statement
                                    </label>
                                    <input type="text" value={narration} maxLength={100}
                                        onChange={(e) => setNarration(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>

                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <p className="text-xs text-gray-500">
                                        {stats.payable} ready and unpaid · {naira(stats.payable_total)} total
                                    </p>
                                    <button
                                        onClick={() => { setAllMatching(true); setTimeout(send, 0); }}
                                        disabled={busy === 'send' || (stats.payable ?? 0) === 0 || !narration.trim()}
                                        className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                                        {busy === 'send' ? 'Queueing…' : `Pay all ${stats.payable ?? 0} · ${naira(stats.payable_total)}`}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 flex gap-3 flex-wrap items-center border-b border-gray-50">
                                <form onSubmit={(e) => { e.preventDefault(); reload({ page: 1 }); }} className="flex-1 min-w-[200px] flex gap-2">
                                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search account name, number or bank…"
                                        className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    <button type="submit" className="px-4 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition">
                                        Search
                                    </button>
                                </form>
                                <div className="flex gap-1.5 flex-wrap">
                                    {[['all', 'All'], ['ready', 'Ready'], ['no_recipient', 'No recipient'], ['unpaid', 'Unpaid'], ['paid', 'Paid']].map(([f, labelText]) => (
                                        <button key={f} onClick={() => reload({ filter: f, page: 1 })}
                                            className={`px-3 py-2.5 text-xs font-semibold rounded-lg transition ${
                                                filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}>
                                            {labelText}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedCount > 0 && !allMatching && (
                                <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-3 flex-wrap">
                                    <p className="text-sm font-semibold text-emerald-900">
                                        {selectedCount} selected · {naira(selectedTotal)}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setSelected([])}
                                            className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition">
                                            Clear
                                        </button>
                                        <button onClick={send} disabled={busy === 'send' || !narration.trim()}
                                            className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl transition">
                                            {busy === 'send' ? 'Queueing…' : `Send ${naira(selectedTotal)}`}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {page.length === 0 ? (
                                <div className="py-16 text-center text-sm text-gray-400">No results for this search or filter.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-100">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-3 text-left">
                                                    <input type="checkbox" checked={pageAllSelected} onChange={toggleAll}
                                                        disabled={selectableOnPage.length === 0}
                                                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                                                </th>
                                                {['#', 'Account Name', 'Bank', 'Code', 'Account No.', 'Amount', 'Recipient', 'Payment', ''].map((h) => (
                                                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {page.map((r, i) => (
                                                <tr key={r.id} className={`transition ${
                                                    selected.includes(r.id) ? 'bg-emerald-50' : r.paid_key ? 'bg-emerald-50/30' : 'hover:bg-gray-50'
                                                }`}>
                                                    <td className="px-3 py-3">
                                                        {!r.paid_key && r.recipient_code && r.amount > 0 && (
                                                            <input type="checkbox" checked={selected.includes(r.id)}
                                                                onChange={() => { setAllMatching(false); setSelected((p) => p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]); }}
                                                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-xs text-gray-400 tabular-nums">{(rows.from ?? 1) + i}</td>
                                                    <td className="px-3 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{r.account_name ?? '—'}</td>
                                                    <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{r.bank_name}</td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        {r.bank_code
                                                            ? <span className="text-xs font-mono text-gray-600">{r.bank_code}</span>
                                                            : <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg">missing</span>}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{r.account_number}</td>
                                                    <td className="px-3 py-3 text-sm font-bold text-gray-800 whitespace-nowrap tabular-nums">{naira(r.amount)}</td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        <Badge status={r.recipient_status} fallback="not created" />
                                                        {r.recipient_status === 'failed' && r.recipient_message && (
                                                            <p className="text-[11px] text-red-400 mt-1 max-w-[200px] truncate" title={r.recipient_message}>{r.recipient_message}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        <Badge status={r.payment_status} fallback="not paid" />
                                                        {r.payment_status === 'failed' && r.payment_message && (
                                                            <p className="text-[11px] text-red-400 mt-1 max-w-[200px] truncate" title={r.payment_message}>{r.payment_message}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        {!r.paid_key && r.recipient_code && r.amount > 0 && (
                                                            <button
                                                                onClick={() => {
                                                                    if (!confirm(`Send ${naira(r.amount)} to ${r.account_name ?? r.account_number}?`)) return;
                                                                    setBusy(`pay-${r.id}`);
                                                                    router.post(route('admin.apo-final-payments.pay', r.id), { narration }, { preserveScroll: true, onFinish: () => setBusy(null) });
                                                                }}
                                                                disabled={busy === `pay-${r.id}` || !narration.trim()}
                                                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition">
                                                                Pay
                                                            </button>
                                                        )}
                                                        {!r.paid_key && (
                                                            <button
                                                                onClick={() => { if (confirm('Remove this row?')) router.delete(route('admin.apo-final-payments.destroy', r.id), { preserveScroll: true }); }}
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

                            {page.length > 0 && (
                                <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between gap-3 flex-wrap">
                                    <p className="text-xs text-gray-400">Showing {rows.from}–{rows.to} of {rows.total}</p>
                                    {rows.last_page > 1 && (
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {rows.links.map((link, i) => (
                                                <button key={i} disabled={!link.url || link.active}
                                                    onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true, replace: true })}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                                                        link.active ? 'bg-indigo-600 text-white'
                                                            : link.url ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            : 'text-gray-300 cursor-default'
                                                    }`} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
