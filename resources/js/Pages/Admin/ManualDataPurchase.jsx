import { useMemo, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

export default function ManualDataPurchase({ type, balance, databoys = [] }) {
    const { flash } = usePage().props;
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState(false);

    const filtered = useMemo(() => {
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (!terms.length) return databoys;
        return databoys.filter((d) => {
            const hay = [d.full_name, d.phone_number, d.network].filter(Boolean).join(' ').toLowerCase();
            return terms.every((t) => hay.includes(t));
        });
    }, [databoys, search]);

    const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
    const allShownSelected = filtered.length > 0 && filtered.every((d) => selected.includes(d.id));
    const toggleAll = () => setSelected(allShownSelected ? [] : filtered.map((d) => d.id));

    const total = useMemo(
        () => databoys.filter((d) => selected.includes(d.id)).reduce((sum, d) => sum + Number(d.plan?.amount || 0), 0),
        [databoys, selected]
    );

    const record = () => {
        if (selected.length === 0) return;
        if (!confirm(
            `Record ${selected.length} data purchase(s) as already bought?\n\n` +
            `This sends NOTHING to EasiGateway. It writes the purchase history and debits ${naira(total)} from the tracked balance.`
        )) return;

        setBusy(true);
        router.post(route('admin.manual-data-purchase.store'), { type, databoy_ids: selected }, {
            preserveScroll: true,
            onSuccess: () => setSelected([]),
            onFinish: () => setBusy(false),
        });
    };

    const switchTo = (t) => router.get(route('admin.manual-data-purchase'), { type: t }, { preserveState: false });

    return (
        <AdminLayout title="Manual Data Purchase">
            <div className="max-w-5xl mx-auto space-y-5">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Manual Data Purchase</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        For data you already bought by hand. Records the purchase and debits the balance without calling EasiGateway.
                    </p>
                </div>

                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3">
                    <p className="text-sm font-bold text-amber-900">Nothing is purchased here</p>
                    <p className="text-xs text-amber-800/80 mt-1">
                        No airtime or data is sent. This only writes the same database records a real purchase writes, so
                        history and the tracked balance match what you bought manually. Selected people will then count as
                        already purchased and stop appearing on the normal Data Purchase page.
                    </p>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}

                <div className="flex gap-2">
                    {[['databoy', 'Databoys'], ['party_agent', 'Party Agents']].map(([t, labelText]) => (
                        <button key={t} onClick={() => switchTo(t)}
                            className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
                                type === t ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}>
                            {labelText}
                        </button>
                    ))}
                    <Link href={route('admin.data-purchase.history', { type })}
                        className="ml-auto px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition">
                        History →
                    </Link>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-gray-600">
                        Tracked balance: <span className="font-bold text-gray-800">{naira(balance)}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                        {selected.length} selected · will debit <span className="font-bold text-gray-800">{naira(total)}</span>
                    </p>
                    <button onClick={record} disabled={busy || selected.length === 0}
                        className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded-xl transition">
                        {busy ? 'Recording…' : `Record ${selected.length} as Purchased`}
                    </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-50 flex gap-3 items-center flex-wrap">
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, phone, network…"
                            className="flex-1 min-w-[200px] px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={toggleAll} disabled={filtered.length === 0}
                            className="px-3 py-2.5 text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 rounded-lg transition">
                            {allShownSelected ? 'Clear all' : `Select all (${filtered.length})`}
                        </button>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">
                            {databoys.length === 0 ? 'Nobody is awaiting a data purchase.' : 'No results for this search.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['', 'Name', 'Network', 'Phone', 'Plan', 'Amount'].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((d) => (
                                        <tr key={d.id} className={`transition ${selected.includes(d.id) ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}>
                                            <td className="px-4 py-3">
                                                <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{d.full_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{d.network}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{d.phone_number}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{d.plan?.validity ?? '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{d.plan ? naira(d.plan.amount) : '—'}</td>
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
