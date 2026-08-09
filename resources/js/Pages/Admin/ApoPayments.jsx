import { useMemo, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const STATUS_STYLES = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    pending: 'bg-blue-50 border-blue-200 text-blue-700',
    unknown: 'bg-amber-50 border-amber-200 text-amber-800',
    failed:  'bg-red-50 border-red-200 text-red-700',
};

function Stat({ label, value, tone = 'gray', hint }) {
    const tones = {
        gray:  'bg-gray-50 text-gray-800',
        green: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        red:   'bg-red-50 text-red-700',
        blue:  'bg-blue-50 text-blue-700',
    };
    return (
        <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`} title={hint}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] font-semibold uppercase opacity-70 mt-0.5">{label}</p>
        </div>
    );
}

const naira = (n) => '₦' + Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

export default function ApoPayments({ history = [], stats }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [busy, setBusy] = useState(false);
    const [exportStatus, setExportStatus] = useState('all');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return history.filter((p) => {
            if (filter !== 'all' && p.status !== filter) return false;
            if (!q) return true;
            return [p.full_name, p.lga, p.account_number].some((v) => (v ?? '').toLowerCase().includes(q));
        });
    }, [history, search, filter]);

    const retry = (officerId) => {
        setBusy(true);
        router.post(route('admin.apo-payments.retry', officerId), {}, {
            preserveScroll: true,
            onFinish: () => setBusy(false),
        });
    };

    const payUnpaid = () => {
        if (!confirm(`Queue payment for ${stats.unpaid} accredited APO officer(s) with no payment on record?`)) return;
        setBusy(true);
        router.post(route('admin.apo-payments.pay-unpaid'), {}, {
            preserveScroll: true,
            onFinish: () => setBusy(false),
        });
    };

    return (
        <AdminLayout title="APO Payments">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">APO Payments</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            One payment per APO officer, enforced by the database — a retry can never pay someone twice.
                        </p>
                    </div>
                    <Link href={route('admin.apo-recipients')}
                        className="px-4 py-2 text-sm font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl transition whitespace-nowrap">
                        ← APO Recipients
                    </Link>
                </div>

                {/* Full-detail export — identity, polling unit, account and outcome */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Download full details</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Name, gender, phone, LGA, ward, polling unit, bank account and payment status in one sheet.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={exportStatus}
                            onChange={(e) => setExportStatus(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="all">All statuses ({history.length})</option>
                            <option value="success">Paid only ({stats.paid})</option>
                            <option value="failed">Failed only ({stats.failed})</option>
                            <option value="pending">Pending only ({stats.pending})</option>
                            <option value="unknown">Needs review only ({stats.unknown})</option>
                        </select>
                        <a
                            href={route('admin.apo-payments.export', { status: exportStatus })}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition whitespace-nowrap flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export Excel
                        </a>
                    </div>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Stat label="Accredited" value={stats.accredited} />
                    <Stat label="Paid" value={stats.paid} tone="green" />
                    <Stat label="Pending" value={stats.pending} tone="blue" />
                    <Stat label="Needs Review" value={stats.unknown} tone="amber" hint="Transfer outcome unknown — verify on Paystack before doing anything" />
                    <Stat label="Failed" value={stats.failed} tone="red" />
                    <Stat label="Not Yet Paid" value={stats.unpaid} tone="amber" />
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-gray-600">
                        Total disbursed: <span className="font-bold text-gray-800">{naira(stats.amount_paid)}</span>
                    </p>
                    <button onClick={payUnpaid} disabled={busy || stats.unpaid === 0}
                        className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-xl transition">
                        Pay {stats.unpaid} Unpaid
                    </button>
                </div>

                {stats.unknown > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                        <p className="text-sm font-bold text-amber-900">{stats.unknown} payment(s) need review</p>
                        <p className="text-xs text-amber-800/80 mt-1">
                            The transfer request did not return a clear answer, so it may or may not have gone through. These are deliberately
                            not retried automatically. Check the transfer on Paystack first — retrying a transfer that actually succeeded is
                            exactly how someone gets paid twice.
                        </p>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 flex gap-3 flex-wrap items-center border-b border-gray-50">
                        <input
                            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, LGA, account…"
                            className="flex-1 min-w-[200px] px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <div className="flex gap-1.5 flex-wrap">
                            {['all', 'success', 'pending', 'unknown', 'failed'].map((f) => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-3 py-2 text-xs font-semibold rounded-lg capitalize transition ${
                                        filter === f ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">
                            {history.length === 0 ? 'No APO payments yet.' : 'No results for this filter.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['#', 'Name', 'LGA', 'Amount', 'Account', 'Status', 'When', ''].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((p, i) => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{p.full_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{p.lga}</td>
                                            <td className="px-4 py-3 text-sm text-gray-800 font-semibold whitespace-nowrap tabular-nums">{naira(p.amount)}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                <span className="tabular-nums">{p.account_number ?? '—'}</span>
                                                <span className="block text-gray-400">{p.bank_name ?? ''}</span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span title={p.message ?? undefined}
                                                    className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border capitalize ${STATUS_STYLES[p.status] ?? STATUS_STYLES.failed}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {p.created_at ? new Date(p.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {p.status === 'failed' && (
                                                    <button onClick={() => retry(p.apo_officer_id)} disabled={busy}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 disabled:opacity-40 transition">
                                                        Retry
                                                    </button>
                                                )}
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
