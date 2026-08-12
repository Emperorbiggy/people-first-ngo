import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

export default function PoCheckIn({ lga, roster = [], stats, amount = 0 }) {
    const { databoy, flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('pending');
    const [busyId, setBusyId] = useState(null);

    const filtered = useMemo(() => {
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

        return roster.filter((o) => {
            if (filter === 'pending' && o.checked_in_at) return false;
            if (filter === 'done' && !o.checked_in_at) return false;
            if (terms.length === 0) return true;

            const hay = [o.full_name, o.phone_number, o.final_pu, o.final_ra_ward, o.final_role]
                .filter(Boolean).join(' ').toLowerCase();

            return terms.every((t) => hay.includes(t));
        });
    }, [roster, search, filter]);

    const checkIn = (o) => {
        if (!confirm(`Check in ${o.full_name}?\n\nThis pays them ${naira(amount)} straight away and cannot be undone.`)) return;

        setBusyId(o.id);
        router.post(route('databoy.po-checkin.check-in', o.id), {}, {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title="APO/PO Check-In" />

            <header className="bg-violet-700 text-white">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="font-bold text-lg leading-tight">APO/PO Check-In</h1>
                        <p className="text-violet-200 text-xs mt-0.5 truncate">
                            {databoy?.full_name} · {lga ?? 'No LGA assigned'}
                        </p>
                    </div>
                    <button
                        onClick={() => router.post(route('databoy.logout'))}
                        className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-500 rounded-lg transition"
                    >
                        Log out
                    </button>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
                {flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>
                )}

                {!lga && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                        <p className="text-sm font-bold text-amber-900">No LGA assigned to your account</p>
                        <p className="text-xs text-amber-800/80 mt-1">Contact the admin — without an LGA there is no roster to show.</p>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                        <p className="text-[11px] font-semibold uppercase text-gray-400 mt-0.5">In {lga ?? '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-emerald-700">{stats.checked_in}</p>
                        <p className="text-[11px] font-semibold uppercase text-emerald-600/70 mt-0.5">Checked In</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-amber-700">{stats.remaining}</p>
                        <p className="text-[11px] font-semibold uppercase text-amber-600/70 mt-0.5">Remaining</p>
                    </div>
                </div>

                <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-2.5 text-center">
                    <p className="text-xs text-violet-800">
                        Each check-in pays <span className="font-bold">{naira(amount)}</span> immediately.
                    </p>
                </div>

                <div className="space-y-2.5">
                    <input
                        type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, phone, polling unit…"
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                    />
                    <div className="flex gap-1.5">
                        {[['pending', 'To check in'], ['done', 'Checked in'], ['all', 'All']].map(([f, labelText]) => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-xl transition ${
                                    filter === f ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
                                }`}>
                                {labelText}
                            </button>
                        ))}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-sm text-gray-400">
                        {roster.length === 0
                            ? `No APO/PO officers found for ${lga ?? 'your LGA'}.`
                            : 'Nobody matches this filter.'}
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {filtered.map((o) => (
                            <div key={o.id}
                                className={`rounded-2xl border p-4 transition ${
                                    o.checked_in_at ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'
                                }`}>
                                <div className="flex items-start gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-gray-800 truncate">{o.full_name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                                            {o.phone_number || '—'}{o.final_role ? ` · ${o.final_role}` : ''}
                                        </p>
                                        {(o.final_ra_ward || o.final_pu) && (
                                            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                                {[o.final_ra_ward, o.final_pu].filter(Boolean).join(' · ')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="shrink-0">
                                        {o.checked_in_at ? (
                                            <div className="text-right">
                                                <span className="inline-flex px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
                                                    ✓ Checked in
                                                </span>
                                                <p className="text-[10px] text-emerald-600/70 mt-1">
                                                    {o.payment_status === 'success' ? 'Paid' : (o.payment_status ?? 'payment queued')}
                                                </p>
                                            </div>
                                        ) : o.ready ? (
                                            <button
                                                onClick={() => checkIn(o)}
                                                disabled={busyId === o.id}
                                                className="px-4 py-2.5 text-xs font-bold rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition"
                                            >
                                                {busyId === o.id ? '…' : 'Check In'}
                                            </button>
                                        ) : (
                                            <span className="inline-flex px-2.5 py-1 bg-amber-100 text-amber-700 text-[11px] font-semibold rounded-lg">
                                                Not ready
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
