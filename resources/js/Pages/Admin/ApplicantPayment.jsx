import { useMemo, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

function formatNaira(value) {
    const n = Number(value);
    if (!n) return '₦0';
    return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ApplicantPayment({ applicantTransferAmount, applications = [] }) {
    const { flash, errors } = usePage().props;
    const [selected, setSelected] = useState([]);
    const [paying, setPaying] = useState(false);
    const [retryingId, setRetryingId] = useState(null);

    const amount = Number(applicantTransferAmount) || 0;
    const allSelected = applications.length > 0 && selected.length === applications.length;
    const batches = Math.max(1, Math.ceil(selected.length / 100));

    const toggleAll = () => {
        setSelected(allSelected ? [] : applications.map((a) => a.id));
    };

    const toggleOne = (id) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const total = useMemo(() => amount * selected.length, [amount, selected.length]);

    const pay = () => {
        if (selected.length === 0) return;
        setPaying(true);
        router.post(route('admin.applicant-payments.pay'), { application_ids: selected }, {
            preserveScroll: true,
            onSuccess: () => setSelected([]),
            onFinish: () => setPaying(false),
        });
    };

    const retryOne = (id) => {
        setRetryingId(id);
        router.post(route('admin.applicant-payments.pay'), { application_ids: [id] }, {
            preserveScroll: true,
            onSuccess: () => setSelected((prev) => prev.filter((x) => x !== id)),
            onFinish: () => setRetryingId(null),
        });
    };

    return (
        <AdminLayout title="Applicant Payment">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Applicant Payment</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Bulk-pay applicants via Paystack transfer, sent in batches of 100.</p>
                    </div>
                    <Link
                        href={route('admin.applicant-payments.paid')}
                        className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition whitespace-nowrap"
                    >
                        View Paid Applicants
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
                        No applicant transfer amount has been set yet.{' '}
                        <Link href={route('admin.settings')} className="font-semibold underline">Set it in Settings</Link>{' '}
                        before paying applicants.
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">Amount per applicant</p>
                            <p className="text-lg font-bold text-gray-800">{formatNaira(amount)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">
                                {selected.length} selected{selected.length > 0 && ` · ${batches} batch${batches !== 1 ? 'es' : ''} of up to 100`}
                            </p>
                            <p className="text-lg font-bold text-indigo-600">{formatNaira(total)}</p>
                        </div>
                    </div>
                )}

                {selected.length > 100 && (
                    <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                        Batches are queued and sent one after another — the next 100 only go out once Paystack has responded for the previous 100. Check the Paid Applicants page shortly for results.
                    </p>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-800">Eligible Applicants</h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {applications.length} awaiting payment · only applicants with a created recipient are listed
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={pay}
                            disabled={paying || amount <= 0 || selected.length === 0}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
                        >
                            {paying ? 'Queuing…' : `Pay Selected (${formatNaira(total)})`}
                        </button>
                    </div>

                    {applications.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-gray-400 text-sm">No applicants are currently eligible for payment.</p>
                            <p className="text-gray-300 text-xs mt-1">
                                An applicant must have a successfully created recipient (see Applicant Recipients) and not have been paid before.
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
                                        {['Name', 'Bank Name', 'Account Number', 'Account Name', 'Status'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {applications.map((app) => {
                                        const isChecked = selected.includes(app.id);
                                        return (
                                        <tr key={app.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <input type="checkbox" checked={isChecked} onChange={() => toggleOne(app.id)}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                            </td>
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{app.full_name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{app.bank_name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{app.account_number}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{app.bank_account_name}</td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                {app.previous_failure ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => retryOne(app.id)}
                                                        disabled={retryingId === app.id || amount <= 0}
                                                        title={app.previous_failure}
                                                        className="inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition"
                                                    >
                                                        {retryingId === app.id ? 'Retrying…' : 'Retry'}
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
