import { useMemo, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const MAX_SELECTION = 100;

function formatNaira(value) {
    const n = Number(value);
    if (!n) return '₦0';
    return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DataboyPayment({ bulkTransferAmount, databoys = [] }) {
    const { flash, errors } = usePage().props;
    const [selected, setSelected] = useState([]);
    const [paying, setPaying] = useState(false);
    const [retryingId, setRetryingId] = useState(null);

    const amount = Number(bulkTransferAmount) || 0;
    const capReached = selected.length >= MAX_SELECTION;
    const allSelected = databoys.length > 0 && selected.length === Math.min(databoys.length, MAX_SELECTION);

    const toggleAll = () => {
        setSelected(allSelected ? [] : databoys.slice(0, MAX_SELECTION).map((d) => d.id));
    };

    const toggleOne = (id) => {
        setSelected((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= MAX_SELECTION) return prev;
            return [...prev, id];
        });
    };

    const total = useMemo(() => amount * selected.length, [amount, selected.length]);

    const pay = () => {
        if (selected.length === 0) return;
        setPaying(true);
        router.post(route('admin.databoy-payments.pay'), { databoy_ids: selected }, {
            preserveScroll: true,
            onSuccess: () => setSelected([]),
            onFinish: () => setPaying(false),
        });
    };

    const retryOne = (id) => {
        setRetryingId(id);
        router.post(route('admin.databoy-payments.pay'), { databoy_ids: [id] }, {
            preserveScroll: true,
            onSuccess: () => setSelected((prev) => prev.filter((x) => x !== id)),
            onFinish: () => setRetryingId(null),
        });
    };

    return (
        <AdminLayout title="Databoy Payment">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Databoy Payment</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Bulk-pay databoys via Paystack transfer using their saved bank details.</p>
                    </div>
                    <Link
                        href={route('admin.databoy-payments.paid')}
                        className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition whitespace-nowrap"
                    >
                        View Paid Databoys
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

                {amount <= 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
                        No bulk transfer amount has been set yet.{' '}
                        <Link href={route('admin.settings')} className="font-semibold underline">Set it in Settings</Link>{' '}
                        before paying databoys.
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">Amount per databoy</p>
                            <p className="text-lg font-bold text-gray-800">{formatNaira(amount)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">
                                {selected.length} / {MAX_SELECTION} selected
                                {capReached && <span className="text-amber-600 font-medium"> — max reached</span>}
                            </p>
                            <p className="text-lg font-bold text-indigo-600">{formatNaira(total)}</p>
                        </div>
                    </div>
                )}

                {/* Pending payments */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-800">Eligible Databoys</h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {databoys.length} awaiting payment · select up to {MAX_SELECTION} at a time
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={pay}
                            disabled={paying || amount <= 0 || selected.length === 0}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
                        >
                            {paying ? 'Paying…' : `Pay Selected (${formatNaira(total)})`}
                        </button>
                    </div>

                    {databoys.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-gray-400 text-sm">No databoys are currently eligible for payment.</p>
                            <p className="text-gray-300 text-xs mt-1">
                                Eligible databoys must have registered at least 2 applicants in every polling unit of their assigned ward and not have been paid before.
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
                                        {['Name', 'Bank Name', 'Account Number', 'Bank Code', 'Account Name', 'Status'].map((h) => (
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
                                                    disabled={!isChecked && capReached}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30" />
                                            </td>
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{db.full_name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{db.bank_name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{db.account_number}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{db.bank_code}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{db.bank_account_name}</td>
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
