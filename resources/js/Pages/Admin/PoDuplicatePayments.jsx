import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

const when = (v) => v
    ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

function Stat({ label, value, tone = 'gray' }) {
    const tones = {
        gray:  'bg-gray-50 text-gray-800',
        red:   'bg-red-50 text-red-700',
        amber: 'bg-amber-50 text-amber-700',
        green: 'bg-emerald-50 text-emerald-700',
    };
    return (
        <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] font-semibold uppercase opacity-70 mt-0.5">{label}</p>
        </div>
    );
}

/** One person paid more than once, with every payment behind it. */
function Group({ group, matchedOn }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border border-red-200 rounded-2xl overflow-hidden bg-white">
            <button onClick={() => setOpen(!open)}
                className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 transition flex items-center justify-between gap-3 text-left">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-red-900 truncate">
                        {group.rows[0]?.full_name || group.key}
                    </p>
                    <p className="text-[11px] text-red-700/80 mt-0.5">
                        paid {group.payments}× · {naira(group.total)} total ·
                        <span className="font-semibold"> {naira(group.excess)} overpaid</span> · matched on {matchedOn}
                    </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-red-700">{open ? 'Hide' : 'Show'} payments</span>
            </button>

            {open && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                {['#', 'Name on row', 'Phone', 'LGA', 'Ward', 'PU', 'Role', 'Bank', 'Account', 'Amount', 'Checked in', 'Paid at', 'Reference'].map((h) => (
                                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {group.rows.map((r, i) => (
                                <tr key={r.payment_id} className={i === 0 ? '' : 'bg-red-50/40'}>
                                    <td className="px-3 py-2.5 text-xs">
                                        {i === 0
                                            ? <span className="text-emerald-600 font-semibold">1st</span>
                                            : <span className="text-red-600 font-bold">extra</span>}
                                    </td>
                                    <td className="px-3 py-2.5 text-sm text-gray-800 whitespace-nowrap">{r.full_name}</td>
                                    <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap tabular-nums">{r.phone_number || '—'}</td>
                                    <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{r.lga || '—'}</td>
                                    <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{r.ward || '—'}</td>
                                    <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap max-w-[160px] truncate" title={r.pu}>{r.pu || '—'}</td>
                                    <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{r.role || '—'}</td>
                                    <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{r.bank_name || '—'}</td>
                                    <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap tabular-nums">{r.paid_account}</td>
                                    <td className="px-3 py-2.5 text-sm font-bold text-gray-800 whitespace-nowrap tabular-nums">{naira(r.amount)}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{when(r.checked_in_at)}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{when(r.paid_at)}</td>
                                    <td className="px-3 py-2.5 text-[11px] font-mono text-gray-400 whitespace-nowrap">{r.reference}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function PoDuplicatePayments({ groups = {}, pending = [], stats = {} }) {
    const [refreshing, setRefreshing] = useState(false);
    // Two ways a settling transfer becomes a duplicate: the person already
    // holds a settled payment, or a second transfer to them is also in flight.
    const atRisk = pending.filter((p) => p.would_duplicate || p.pending_twice);
    const pendingPairs = new Set(pending.filter((p) => p.pending_twice).map((p) => p.full_name.toLowerCase())).size;
    const sections = [
        { key: 'name',    title: 'Same person, different rows',   matchedOn: 'name',           hint: 'Name reduced to letters only, so spacing, case and punctuation differences still match. This is the one that catches someone checking in twice under two entries.' },
        { key: 'phone',   title: 'Same phone number',             matchedOn: 'phone number',   hint: 'Two roster rows sharing a phone number — usually the same person listed twice under different spellings.' },
        { key: 'account', title: 'Same account number',           matchedOn: 'account number', hint: 'Should be impossible: account numbers are unique per officer. Anything here means a row was deleted and re-imported.' },
    ];

    const totalGroups = sections.reduce((n, s) => n + (groups[s.key]?.length ?? 0), 0);
    const totalExcess = sections.reduce(
        (sum, s) => sum + (groups[s.key] ?? []).reduce((a, g) => a + Number(g.excess || 0), 0), 0
    );

    return (
        <AdminLayout title="Duplicate APO/PO Payments">
            <div className="max-w-7xl mx-auto space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Duplicate APO/PO Payments</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            The same person paid more than once — checked in under two roster rows and collected twice.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={route('admin.po-officers')}
                            className="px-4 py-2 text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition">
                            APO/PO Officers
                        </Link>
                        {totalGroups > 0 && (
                            <a href={route('admin.po-duplicate-payments.export')}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition">
                                Export CSV
                            </a>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Stat label="Successful Payments" value={stats.live_payments ?? 0} />
                    <Stat label="Total Paid" value={naira(stats.total_paid)} tone="green" />
                    <Stat label="Duplicate Cases" value={totalGroups} tone={totalGroups > 0 ? 'red' : 'green'} />
                    <Stat label="Overpaid" value={naira(totalExcess)} tone={totalExcess > 0 ? 'red' : 'green'} />
                </div>

                {pending.length > 0 && (
                    <div className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${atRisk.length > 0 ? 'border-red-300' : 'border-amber-200'}`}>
                        <div className={`px-5 py-4 border-b flex items-start justify-between gap-3 flex-wrap ${
                            atRisk.length > 0 ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                        }`}>
                            <div>
                                <p className={`text-sm font-bold ${atRisk.length > 0 ? 'text-red-900' : 'text-amber-900'}`}>
                                    {pending.length} transfer(s) still settling
                                </p>
                                <p className={`text-xs mt-0.5 ${atRisk.length > 0 ? 'text-red-700/80' : 'text-amber-800/80'}`}>
                                    {atRisk.length > 0
                                        ? `${atRisk.length} will become a duplicate once they land`
                                          + (pendingPairs > 0 ? ` — including ${pendingPairs} person(s) with two transfers in flight at once.` : ' — that person already has a successful payment.')
                                        : 'None of these belong to someone already paid, and nobody has two transfers in flight.'}
                                </p>
                            </div>
                            <button
                                onClick={() => { setRefreshing(true); router.post(route('admin.po-officers.refresh-payment-statuses'), {}, { preserveScroll: true, onFinish: () => setRefreshing(false) }); }}
                                disabled={refreshing}
                                className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                                {refreshing ? 'Checking…' : 'Refresh from Paystack'}
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['', 'Name', 'Phone', 'LGA', 'Role', 'Bank', 'Account', 'Amount', 'Status', 'Checked in', 'Sent at', 'Reference'].map((h) => (
                                            <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {pending.map((p) => (
                                        <tr key={p.payment_id} className={p.would_duplicate || p.pending_twice ? 'bg-red-50/60' : ''}>
                                            <td className="px-3 py-2.5 whitespace-nowrap space-x-1">
                                                {p.would_duplicate && (
                                                    <span className="inline-flex px-2 py-0.5 bg-red-100 text-red-700 text-[11px] font-bold rounded-lg">
                                                        already paid
                                                    </span>
                                                )}
                                                {p.pending_twice && (
                                                    <span className="inline-flex px-2 py-0.5 bg-orange-100 text-orange-700 text-[11px] font-bold rounded-lg"
                                                        title={`${p.pending_count} transfers to this person are in flight`}>
                                                        {p.pending_count}× in flight
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 text-sm font-medium text-gray-800 whitespace-nowrap">{p.full_name}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap tabular-nums">{p.phone_number || '—'}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{p.lga || '—'}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{p.role || '—'}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{p.bank_name || '—'}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap tabular-nums">{p.paid_account}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-gray-800 whitespace-nowrap tabular-nums">{naira(p.amount)}</td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-lg capitalize ${
                                                    p.status === 'unknown' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {p.status === 'unknown' ? 'needs review' : p.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{when(p.checked_in_at)}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{when(p.paid_at)}</td>
                                            <td className="px-3 py-2.5 text-[11px] font-mono text-gray-400 whitespace-nowrap">{p.reference}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-500">
                            Paystack settles transfers asynchronously, so "pending" here means sent but not yet confirmed.
                            Refreshing asks Paystack for the real outcome — a confirmed failure frees that officer to be retried,
                            a confirmed success moves them into the duplicate check above.
                        </div>
                    </div>
                )}

                {totalGroups === 0 ? (
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
                        <div className="inline-flex w-12 h-12 rounded-full bg-emerald-100 items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-sm font-bold text-emerald-900">No duplicate payments found</p>
                        <p className="text-xs text-emerald-700/80 mt-1 max-w-md mx-auto">
                            Across {stats.live_payments ?? 0} successful payment(s), nobody appears twice by name, phone number or account number.
                        </p>
                    </div>
                ) : (
                    sections.map((section) => {
                        const list = groups[section.key] ?? [];

                        return (
                            <div key={section.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-50">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-sm font-bold text-gray-800">{section.title}</h2>
                                        <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-lg ${
                                            list.length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {list.length} case{list.length === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{section.hint}</p>
                                </div>

                                {list.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-gray-400">Nothing found by {section.matchedOn}.</div>
                                ) : (
                                    <div className="p-4 space-y-2.5">
                                        {list.map((group) => (
                                            <Group key={`${section.key}-${group.key}`} group={group} matchedOn={section.matchedOn} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}

                <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                    Only payments confirmed <span className="font-semibold">successful</span> are counted — a failed attempt never
                    moved money, and a pending one may still fail. The first payment in each group is
                    treated as the legitimate one and everything after it as the overpayment, so check the dates before acting.
                    A person can legitimately appear in more than one section, so the same case may be listed twice.
                </p>
            </div>
        </AdminLayout>
    );
}
