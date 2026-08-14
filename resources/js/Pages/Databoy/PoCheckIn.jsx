import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

export default function PoCheckIn({ lga, allLgas = false, lgas = [], roster = [], stats, amount = 0 }) {
    const { databoy, flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('pending');
    const [lgaFilter, setLgaFilter] = useState('all');
    const [busyId, setBusyId] = useState(null);
    const [confirming, setConfirming] = useState(null);

    const filtered = useMemo(() => {
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

        return roster.filter((o) => {
            if (filter === 'pending' && o.checked_in_at) return false;
            if (filter === 'done' && !o.checked_in_at) return false;
            // Only ever set on a statewide login, which needs to narrow the
            // roster down to the LGA it is actually standing in.
            if (lgaFilter !== 'all' && o.final_lga !== lgaFilter) return false;
            if (terms.length === 0) return true;

            const hay = [o.full_name, o.phone_number, o.final_pu, o.final_ra_ward, o.final_role, o.final_lga]
                .filter(Boolean).join(' ').toLowerCase();

            return terms.every((t) => hay.includes(t));
        });
    }, [roster, search, filter, lgaFilter]);

    // Paying is irreversible, so the confirm step shows exactly who and how
    // much rather than a browser dialog that says neither clearly.
    const confirmCheckIn = () => {
        const officer = confirming;
        setBusyId(officer.id);

        router.post(route('databoy.po-checkin.check-in', officer.id), {}, {
            preserveScroll: true,
            onSuccess: () => setConfirming(null),
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
                            {databoy?.full_name} · {allLgas ? 'All LGAs' : (lga ?? 'No LGA assigned')}
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

                {!lga && !allLgas && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                        <p className="text-sm font-bold text-amber-900">No LGA assigned to your account</p>
                        <p className="text-xs text-amber-800/80 mt-1">Contact the admin — without an LGA there is no roster to show.</p>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                        <p className="text-[11px] font-semibold uppercase text-gray-400 mt-0.5">
                            {allLgas ? (lgaFilter === 'all' ? 'Statewide' : lgaFilter) : `In ${lga ?? '—'}`}
                        </p>
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
                        placeholder={allLgas ? 'Search name, phone, LGA, polling unit…' : 'Search name, phone, polling unit…'}
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                    />
                    {allLgas && lgas.length > 0 && (
                        <select value={lgaFilter} onChange={(e) => setLgaFilter(e.target.value)}
                            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                            <option value="all">All LGAs ({roster.length})</option>
                            {lgas.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                    )}
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
                            ? `No APO/PO officers found${allLgas ? '' : ` for ${lga ?? 'your LGA'}`}.`
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
                                        {allLgas && o.final_lga && (
                                            <p className="text-[11px] font-semibold text-violet-600 mt-0.5">{o.final_lga}</p>
                                        )}
                                        {(o.final_ra_ward || o.final_pu) && (
                                            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                                {[o.final_ra_ward, o.final_pu].filter(Boolean).join(' · ')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="shrink-0">
                                        {o.checked_in_at ? (
                                            <span className="inline-flex px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
                                                ✓ Checked in
                                            </span>
                                        ) : o.ready ? (
                                            <button
                                                onClick={() => setConfirming(o)}
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

            {/* Confirm check-in — money moves on OK, so the person and the
                amount are both spelled out before the button is reachable. */}
            {confirming && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
                    onClick={() => busyId === null && setConfirming(null)}
                >
                    <div
                        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_.2s_ease-out]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-violet-700 px-6 py-5 text-center">
                            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-full mb-3">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-white font-bold text-lg leading-tight">Confirm Check-In</p>
                            <p className="text-violet-200 text-xs mt-1">This cannot be undone</p>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <div className="text-center">
                                <p className="text-lg font-bold text-gray-800 leading-tight">{confirming.full_name}</p>
                                <p className="text-sm text-gray-500 mt-1 tabular-nums">
                                    {confirming.phone_number || 'No phone'}{confirming.final_role ? ` · ${confirming.final_role}` : ''}
                                </p>
                                {(confirming.final_ra_ward || confirming.final_pu) && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        {[confirming.final_ra_ward, confirming.final_pu].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2.5 pt-1">
                                <button
                                    onClick={() => setConfirming(null)}
                                    disabled={busyId !== null}
                                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmCheckIn}
                                    disabled={busyId !== null}
                                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
                                >
                                    {busyId !== null ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Checking in…
                                        </>
                                    ) : 'Check In'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>
        </div>
    );
}
