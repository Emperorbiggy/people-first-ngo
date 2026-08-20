import { useMemo, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

function Stat({ label, value, tone = 'gray' }) {
    const tones = {
        gray:  'bg-gray-50 text-gray-800',
        green: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        red:   'bg-red-50 text-red-700',
    };
    return (
        <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] font-semibold uppercase opacity-70 mt-0.5">{label}</p>
        </div>
    );
}

function Badge({ status }) {
    if (!status) return <span className="text-xs text-gray-400">not paid</span>;

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

export default function AwaitingCompensationPayment({ rows = [], stats = {} }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('unpaid');
    const [busy, setBusy] = useState(null);

    const filtered = useMemo(() => {
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

        return rows.filter((r) => {
            if (filter === 'unpaid' && r.paid) return false;
            if (filter === 'paid' && !r.paid) return false;
            if (filter === 'not_ready' && r.ready) return false;
            if (terms.length === 0) return true;

            const hay = [r.uploaded_name, r.databoy_name, r.phone, r.lga, r.account_number, r.bank_name]
                .filter(Boolean).join(' ').toLowerCase();

            return terms.every((t) => hay.includes(t));
        });
    }, [rows, search, filter]);

    const payAll = () => {
        if (stats.payable === 0) return;
        if (!confirm(
            `Pay ${stats.payable} databoy(s) a total of ${naira(stats.to_pay)}?\n\n`
            + `Each is paid the amount approved for them. Anyone already paid is skipped. This moves real money.`
        )) return;

        setBusy('all');
        router.post(route('admin.awaiting-compensation-payment.pay-all'), {}, {
            preserveScroll: true,
            onFinish: () => setBusy(null),
        });
    };

    return (
        <AdminLayout title="Awaiting Compensation Payment">
            <div className="max-w-7xl mx-auto space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Awaiting Compensation Payment</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Approved databoys, each paid the amount set for them — one transfer at a time.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={route('admin.databoy-compensation')}
                            className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition whitespace-nowrap">
                            Back to Review
                        </Link>
                        <button onClick={payAll} disabled={busy === 'all' || stats.payable === 0}
                            className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                            {busy === 'all' ? 'Queueing…' : `Pay All (${naira(stats.to_pay)})`}
                        </button>
                    </div>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <Stat label="Approved" value={stats.total ?? 0} />
                    <Stat label="Ready to Pay" value={stats.payable ?? 0} tone="amber" />
                    <Stat label="To Disburse" value={naira(stats.to_pay)} tone="amber" />
                    <Stat label="Paid" value={stats.paid ?? 0} tone="green" />
                    <Stat label="Disbursed" value={naira(stats.paid_amount)} tone="green" />
                </div>

                {(stats.not_ready ?? 0) > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800">
                        <span className="font-semibold">{stats.not_ready} approved databoy(s) have no transfer recipient</span> and
                        cannot be paid. Create their recipient first — they are listed under the "No recipient" filter.
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 flex gap-3 flex-wrap items-center border-b border-gray-50">
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, phone, LGA, account…"
                            className="flex-1 min-w-[200px] px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <div className="flex gap-1.5 flex-wrap">
                            {[['unpaid', 'Unpaid'], ['paid', 'Paid'], ['not_ready', 'No recipient'], ['all', 'All']].map(([f, labelText]) => (
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
                            {rows.length === 0 ? 'Nothing approved yet.' : 'No results for this filter.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['#', 'Uploaded Name', 'Databoy', 'Phone', 'LGA', 'Bank', 'Account', 'Account Name', 'Amount', 'Payment', ''].map((h) => (
                                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((r, i) => (
                                        <tr key={r.id} className={`transition ${r.paid ? 'bg-emerald-50/30' : 'hover:bg-gray-50'}`}>
                                            <td className="px-3 py-3 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{r.uploaded_name}</td>
                                            <td className="px-3 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{r.databoy_name}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{r.phone ?? '—'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{r.lga}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{r.bank_name ?? '—'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{r.account_number ?? '—'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{r.account_name ?? '—'}</td>
                                            <td className="px-3 py-3 text-sm font-bold text-gray-800 whitespace-nowrap tabular-nums">{naira(r.amount)}</td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {r.ready
                                                    ? <Badge status={r.payment_status} />
                                                    : <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg">no recipient</span>}
                                                {r.payment_status === 'failed' && r.payment_message && (
                                                    <p className="text-[11px] text-red-400 mt-1 max-w-[200px] truncate" title={r.payment_message}>{r.payment_message}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {!r.paid && r.ready && (
                                                    <button
                                                        onClick={() => { if (confirm(`Pay ${naira(r.amount)} to ${r.databoy_name}?`)) { setBusy(`pay-${r.id}`); router.post(route('admin.awaiting-compensation-payment.pay', r.id), {}, { preserveScroll: true, onFinish: () => setBusy(null) }); } }}
                                                        disabled={busy === `pay-${r.id}`}
                                                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition">
                                                        Pay
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
                            Showing {filtered.length} of {rows.length}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
