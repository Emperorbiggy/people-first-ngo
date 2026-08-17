import { useMemo, useState } from 'react';
import { router, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

const shortDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    : '—';

function Stat({ label, value, tone = 'gray', hint }) {
    const tones = {
        gray:  'bg-gray-50 text-gray-800',
        red:   'bg-red-50 text-red-700',
        amber: 'bg-amber-50 text-amber-700',
        green: 'bg-emerald-50 text-emerald-700',
    };
    return (
        <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`} title={hint}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] font-semibold uppercase opacity-70 mt-0.5">{label}</p>
        </div>
    );
}

export default function DuplicatePayments({ duplicates = [], scope = 'success', stats }) {
    const [search, setSearch] = useState('');
    const [onlyCrossPool, setOnlyCrossPool] = useState(false);
    const [open, setOpen] = useState([]);

    const filtered = useMemo(() => {
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

        return duplicates.filter((d) => {
            if (onlyCrossPool && d.across_pools < 2) return false;
            if (terms.length === 0) return true;

            const hay = [d.account_number, ...(d.names ?? []), ...d.payments.map((p) => p.source)]
                .filter(Boolean).join(' ').toLowerCase();

            return terms.every((t) => hay.includes(t));
        });
    }, [duplicates, search, onlyCrossPool]);

    const toggle = (account) =>
        setOpen((p) => p.includes(account) ? p.filter((x) => x !== account) : [...p, account]);

    return (
        <AdminLayout title="Duplicate Payment Check">
            <div className="max-w-6xl mx-auto space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Duplicate Payment Check</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Bank accounts paid more than once, across every payment pool.
                        </p>
                    </div>
                    <div className="flex gap-1.5">
                        {[['success', 'Successful only'], ['all', 'Include pending']].map(([s, labelText]) => (
                            <button key={s}
                                onClick={() => router.get(route('admin.duplicate-payments'), { scope: s }, { preserveScroll: true })}
                                className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
                                    scope === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}>
                                {labelText}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <Stat label="Payments scanned" value={stats.payments_scanned} />
                    <Stat label="Accounts paid" value={stats.accounts} />
                    <Stat label="Paid twice or more" value={stats.duplicate_accounts} tone={stats.duplicate_accounts > 0 ? 'amber' : 'green'}
                        hint="Includes legitimate cases — a person can be owed from two different pools" />
                    <Stat label="Same pool twice" value={stats.same_pool} tone={stats.same_pool > 0 ? 'red' : 'green'}
                        hint="The real anomaly: one pool paid the same account more than once" />
                    <Stat label="Amount at risk" value={naira(stats.exposure)} tone={stats.exposure > 0 ? 'red' : 'green'}
                        hint="Only counts same-pool repeats, not separate entitlements" />
                </div>

                {stats.same_pool > 0 && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3">
                        <p className="text-sm font-bold text-red-900">
                            {stats.same_pool} account{stats.same_pool === 1 ? '' : 's'} paid twice by the same pool
                        </p>
                        <p className="text-xs text-red-800/80 mt-1">
                            Start here. One pool paying the same account more than once is an overpayment, not an entitlement —
                            {' '}{naira(stats.exposure)} was paid beyond the first payment.
                        </p>
                    </div>
                )}

                {stats.cross_pool > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                        <p className="text-sm font-bold text-amber-900">
                            {stats.cross_pool} account{stats.cross_pool === 1 ? '' : 's'} paid from more than one pool
                        </p>
                        <p className="text-xs text-amber-800/80 mt-1">
                            Often legitimate — someone can be owed an applicant payment and an accreditation payment, which the
                            system treats as separate entitlements on purpose. Worth reviewing, not assuming.
                        </p>
                    </div>
                )}

                {duplicates.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                        <div className="inline-flex w-12 h-12 rounded-full bg-emerald-100 items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-sm font-bold text-gray-800">No account has been paid twice</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {stats.payments_scanned} payment{stats.payments_scanned === 1 ? '' : 's'} checked across {stats.accounts} account{stats.accounts === 1 ? '' : 's'}.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 flex gap-3 flex-wrap items-center border-b border-gray-50">
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search account number, name, pool…"
                                className="flex-1 min-w-[220px] px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 whitespace-nowrap">
                                <input type="checkbox" checked={onlyCrossPool} onChange={(e) => setOnlyCrossPool(e.target.checked)}
                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                                Across pools only
                            </label>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {filtered.map((d) => (
                                <div key={d.account_number}>
                                    <button onClick={() => toggle(d.account_number)}
                                        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition text-left">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-800 tabular-nums">
                                                {d.account_number}
                                                {d.repeated_pools?.length > 0 && (
                                                    <span className="ml-2 inline-flex px-2 py-0.5 bg-red-100 text-red-700 text-[11px] font-semibold rounded-lg">
                                                        {d.repeated_pools.map((r) => `${r.pool} ×${r.times}`).join(', ')}
                                                    </span>
                                                )}
                                                {d.across_pools > 1 && (
                                                    <span className="ml-2 inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-semibold rounded-lg">
                                                        {d.across_pools} pools
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                {d.names.length > 0 ? d.names.join(' / ') : '—'}
                                                {d.names.length > 1 && (
                                                    <span className="ml-1 text-amber-600 font-semibold">· different names on one account</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-gray-800">{naira(d.total)}</p>
                                            <p className="text-[11px] text-red-600 font-semibold">paid {d.times_paid}×</p>
                                        </div>
                                    </button>

                                    {open.includes(d.account_number) && (
                                        <div className="px-4 pb-4 bg-gray-50/60">
                                            <table className="min-w-full text-xs">
                                                <thead>
                                                    <tr className="text-left text-gray-500 uppercase">
                                                        {['#', 'Pool', 'Name used', 'Bank', 'Amount', 'Status', 'Date', 'Reference'].map((h) => (
                                                            <th key={h} className="py-2 pr-3 font-semibold whitespace-nowrap">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {d.payments.map((p, i) => (
                                                        <tr key={i} className={i === 0 ? 'text-gray-500' : 'text-red-700 font-medium'}>
                                                            <td className="py-1.5 pr-3">{i === 0 ? '1st' : `${i + 1}th`}</td>
                                                            <td className="py-1.5 pr-3 whitespace-nowrap">{p.source}</td>
                                                            <td className="py-1.5 pr-3 whitespace-nowrap">{p.name ?? '—'}</td>
                                                            <td className="py-1.5 pr-3 whitespace-nowrap">{p.bank_name ?? '—'}</td>
                                                            <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">{naira(p.amount)}</td>
                                                            <td className="py-1.5 pr-3 whitespace-nowrap capitalize">{p.status}</td>
                                                            <td className="py-1.5 pr-3 whitespace-nowrap">{shortDate(p.created_at)}</td>
                                                            <td className="py-1.5 pr-3 font-mono text-[11px] text-gray-400">{p.reference ?? '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <p className="text-[11px] text-gray-400 mt-2">
                                                The first payment is treated as the legitimate one; everything below it is the overpayment.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
                            Showing {filtered.length} of {duplicates.length} duplicated account{duplicates.length === 1 ? '' : 's'}
                            {' · '}
                            <Link href={route('admin.apo-payments')} className="font-semibold text-indigo-600 hover:text-indigo-800">
                                APO payments →
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
