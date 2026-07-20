import { useMemo, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import TargetTypeToggle from '@/Components/TargetTypeToggle';

function formatNaira(value) {
    const n = Number(value);
    if (!n) return '₦0';
    return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DataPurchase({ type = 'databoy', balance = 0, databoys = [] }) {
    const { flash } = usePage().props;
    const [selected, setSelected] = useState([]);
    const [sending, setSending] = useState(false);
    const [retryingId, setRetryingId] = useState(null);

    const label = type === 'party_agent' ? 'party agent' : 'databoy';
    const allSelected = databoys.length > 0 && selected.length === databoys.length;

    const changeType = (newType) => {
        if (newType === type) return;
        setSelected([]);
        router.get(route('admin.data-purchase'), { type: newType }, { preserveScroll: true });
    };

    const toggleAll = () => {
        setSelected(allSelected ? [] : databoys.map((d) => d.id));
    };

    const toggleOne = (id) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const total = useMemo(
        () => databoys.filter((d) => selected.includes(d.id)).reduce((sum, d) => sum + Number(d.plan?.amount ?? 0), 0),
        [databoys, selected]
    );

    const send = () => {
        if (selected.length === 0) return;
        setSending(true);
        router.post(route('admin.data-purchase.send'), { databoy_ids: selected, type }, {
            preserveScroll: true,
            onSuccess: () => setSelected([]),
            onFinish: () => setSending(false),
        });
    };

    const retryOne = (id) => {
        setRetryingId(id);
        router.post(route('admin.data-purchase.send'), { databoy_ids: [id], type }, {
            preserveScroll: true,
            onSuccess: () => setSelected((prev) => prev.filter((x) => x !== id)),
            onFinish: () => setRetryingId(null),
        });
    };

    return (
        <AdminLayout title="Purchase Data">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Purchase Data</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Buys each {label}'s configured data plan one at a time via EasiGateway — each finishes before the next starts.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <TargetTypeToggle type={type} onChange={changeType} />
                        <Link
                            href={route('admin.data-purchase.history', { type })}
                            className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition whitespace-nowrap"
                        >
                            View Data Purchase History
                        </Link>
                    </div>
                </div>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                        {flash.error}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <p className="text-xs text-gray-500">Wallet Balance (tracked internally)</p>
                        <p className="text-lg font-bold text-gray-800">{formatNaira(balance)}</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                        <p className="text-xs text-gray-500">{selected.length} selected</p>
                        <p className="text-lg font-bold text-indigo-600">{formatNaira(total)}</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-800">Eligible {type === 'party_agent' ? 'Party Agents' : 'Databoys'}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {databoys.length} awaiting data · only {label}s whose network has a configured plan are listed
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={send}
                            disabled={sending || selected.length === 0}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
                        >
                            {sending ? 'Queuing…' : `Buy Data (${formatNaira(total)})`}
                        </button>
                    </div>

                    {databoys.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-gray-400 text-sm">No {label}s are currently eligible for data.</p>
                            <p className="text-gray-300 text-xs mt-1">
                                A {label} needs a browsing network/number, a configured plan for that network (see Data Plans), and no prior successful purchase.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        <th className="px-5 py-3">
                                            <input type="checkbox" checked={allSelected} onChange={toggleAll}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                        </th>
                                        {['Name', 'Network', 'Phone Number', 'Plan', 'Amount', 'Status'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {databoys.map((db) => {
                                        const isChecked = selected.includes(db.id);
                                        return (
                                        <tr key={db.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <input type="checkbox" checked={isChecked} onChange={() => toggleOne(db.id)}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                            </td>
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{db.full_name}</td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-lg whitespace-nowrap">
                                                    {db.network}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{db.phone_number}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 max-w-xs truncate">{db.plan?.validity ?? '—'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{formatNaira(db.plan?.amount)}</td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                {db.previous_failure ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => retryOne(db.id)}
                                                        disabled={retryingId === db.id}
                                                        title={db.previous_failure}
                                                        className="inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition"
                                                    >
                                                        {retryingId === db.id ? 'Retrying…' : 'Retry'}
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border bg-gray-50 border-gray-200 text-gray-500">
                                                        New
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </AdminLayout>
    );
}
