import { useMemo, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

function formatNaira(value) {
    const n = Number(value);
    if (!n) return '₦0';
    return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Airtime({ airtimeAmount, balance = 0, databoys = [] }) {
    const { flash, errors } = usePage().props;
    const [selected, setSelected] = useState([]);
    const [sending, setSending] = useState(false);
    const [retryingId, setRetryingId] = useState(null);

    const amount = Number(airtimeAmount) || 0;
    const allSelected = databoys.length > 0 && selected.length === databoys.length;

    const toggleAll = () => {
        setSelected(allSelected ? [] : databoys.map((d) => d.id));
    };

    const toggleOne = (id) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const total = useMemo(() => amount * selected.length, [amount, selected.length]);

    const send = () => {
        if (selected.length === 0) return;
        setSending(true);
        router.post(route('admin.airtime.send'), { databoy_ids: selected }, {
            preserveScroll: true,
            onSuccess: () => setSelected([]),
            onFinish: () => setSending(false),
        });
    };

    const retryOne = (id) => {
        setRetryingId(id);
        router.post(route('admin.airtime.send'), { databoy_ids: [id] }, {
            preserveScroll: true,
            onSuccess: () => setSelected((prev) => prev.filter((x) => x !== id)),
            onFinish: () => setRetryingId(null),
        });
    };

    return (
        <AdminLayout title="Send Airtime">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Send Airtime</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Sends airtime to databoys one at a time via EasiGateway — each finishes before the next starts.</p>
                    </div>
                    <Link
                        href={route('admin.airtime.history')}
                        className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition whitespace-nowrap"
                    >
                        View Airtime History
                    </Link>
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

                {errors?.amount && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                        {errors.amount}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <p className="text-xs text-gray-500">Wallet Balance (tracked internally)</p>
                        <p className="text-lg font-bold text-gray-800">{formatNaira(balance)}</p>
                    </div>

                    {amount <= 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800 flex items-center">
                            No airtime amount has been set yet.{' '}
                            <Link href={route('admin.settings')} className="font-semibold underline ml-1">Set it in Settings</Link>.
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500">Amount per databoy</p>
                                <p className="text-lg font-bold text-gray-800">{formatNaira(amount)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500">{selected.length} selected</p>
                                <p className="text-lg font-bold text-indigo-600">{formatNaira(total)}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-800">Eligible Databoys</h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {databoys.length} awaiting airtime · only databoys with a created recipient are listed
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={send}
                            disabled={sending || amount <= 0 || selected.length === 0}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
                        >
                            {sending ? 'Queuing…' : `Send Airtime (${formatNaira(total)})`}
                        </button>
                    </div>

                    {databoys.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-gray-400 text-sm">No databoys are currently eligible for airtime.</p>
                            <p className="text-gray-300 text-xs mt-1">
                                A databoy must have a successfully created airtime recipient (see Airtime Recipients) and not have been sent airtime before.
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
                                        {['Name', 'Network', 'Phone Number', 'Status'].map((h) => (
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
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                {db.previous_failure ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => retryOne(db.id)}
                                                        disabled={retryingId === db.id || amount <= 0}
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
