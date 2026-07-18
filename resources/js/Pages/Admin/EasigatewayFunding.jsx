import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

function formatNaira(value) {
    const n = Number(value);
    if (!n) return '₦0';
    return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_STYLES = {
    success: 'bg-green-50 border-green-200 text-green-700',
    pending: 'bg-amber-50 border-amber-200 text-amber-700',
    failed:  'bg-red-50 border-red-200 text-red-700',
};

function StatusBadge({ status }) {
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${STATUS_STYLES[status] ?? 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            {status}
        </span>
    );
}

function CheckoutModal({ funding, onClose }) {
    const [latest, setLatest] = useState(funding);
    const [now, setNow] = useState(Date.now());
    const [verifying, setVerifying] = useState(false);
    const [copied, setCopied] = useState(false);

    // Tick every second so the countdown display stays live.
    useEffect(() => {
        const tick = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(tick);
    }, []);

    const expiresAtMs = latest.expires_at
        ? new Date(latest.expires_at).getTime()
        : new Date(latest.created_at).getTime() + 30 * 60 * 1000;
    const remainingMs = Math.max(0, expiresAtMs - now);
    const expired = remainingMs <= 0;
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    const runVerify = (silent) => {
        setVerifying(true);
        router.post(route('admin.easigateway-funding.verify', latest.id), { silent }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                const updated = page.props.fundings?.find((f) => f.id === latest.id);
                if (updated) setLatest(updated);
            },
            onFinish: () => setVerifying(false),
        });
    };

    // Auto-verify every 15 seconds while pending and not yet expired.
    useEffect(() => {
        if (latest.status !== 'pending' || expired) return;
        const interval = setInterval(() => runVerify(true), 15000);
        return () => clearInterval(interval);
    }, [latest.status, expired, latest.id]);

    const copyAccountNumber = async () => {
        if (!latest.account_number) return;
        try {
            await navigator.clipboard.writeText(latest.account_number);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard not available, ignore */ }
    };

    const verified = latest.status === 'success';

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-800">{verified ? 'Payment Received' : 'Complete Your Transfer'}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Ref: {latest.reference}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {verified ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-2">
                            <svg className="w-10 h-10 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-semibold text-green-800">Wallet credited with {formatNaira(latest.amount)}</p>
                            <button onClick={onClose} className="text-xs text-green-700 underline">Close</button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-4 text-center">
                                <p className="text-xs text-indigo-500">Amount to Transfer</p>
                                <p className="text-2xl font-bold text-indigo-800 mt-0.5">{formatNaira(latest.total_amount ?? latest.amount)}</p>
                                {latest.fee_amount > 0 && (
                                    <p className="text-xs text-indigo-400 mt-1">
                                        {formatNaira(latest.amount)} funding + {formatNaira(latest.fee_amount)} transfer fee
                                    </p>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 border border-gray-100">
                                <div className="flex items-center justify-between px-4 py-3">
                                    <span className="text-xs text-gray-500">Bank</span>
                                    <span className="text-sm font-medium text-gray-800">{latest.bank_name ?? '—'}</span>
                                </div>
                                <div className="flex items-center justify-between px-4 py-3">
                                    <span className="text-xs text-gray-500">Account Number</span>
                                    <button type="button" onClick={copyAccountNumber} className="text-sm font-mono font-bold text-indigo-700 hover:underline">
                                        {latest.account_number ?? '—'} {copied ? '✓ copied' : ''}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between px-4 py-3">
                                    <span className="text-xs text-gray-500">Account Name</span>
                                    <span className="text-sm font-medium text-gray-800">{latest.account_name ?? '—'}</span>
                                </div>
                            </div>

                            <div className={`rounded-xl px-4 py-3 text-center text-sm font-semibold ${
                                expired ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                            }`}>
                                {expired ? 'This checkout has expired' : `Expires in ${minutes}:${String(seconds).padStart(2, '0')}`}
                            </div>

                            <p className="text-xs text-gray-400 text-center">
                                {expired
                                    ? 'Auto-verification has stopped, but you can still verify manually if you already paid.'
                                    : verifying ? 'Checking for payment…' : 'Checking automatically every 15 seconds…'}
                            </p>

                            <button
                                type="button"
                                onClick={() => runVerify(false)}
                                disabled={verifying}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
                            >
                                {verifying ? 'Verifying…' : 'Verify Now'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function FundForm() {
    const { auth } = usePage().props;
    const [amount, setAmount] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        setSaving(true);
        router.post(route('admin.easigateway-funding.create'), { amount }, {
            preserveScroll: true,
            onSuccess: () => setAmount(''),
            onFinish: () => setSaving(false),
        });
    };

    return (
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
                <p className="font-semibold text-gray-800">Fund Wallet</p>
                <p className="text-xs text-gray-500 mt-0.5">Creates a virtual bank account via EasiGateway — transfer the amount there, then verify.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                    <label className="text-xs font-medium text-gray-600">Amount</label>
                    <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₦</span>
                        <input type="number" min="1" step="0.01" required value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                </div>
                <p className="text-xs text-gray-400">
                    Billed to <span className="font-medium text-gray-600">{auth?.user?.name}</span> ({auth?.user?.email})
                </p>
            </div>
            <button type="submit" disabled={saving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
                {saving ? 'Creating virtual account…' : 'Create Funding Request'}
            </button>
        </form>
    );
}

export default function EasigatewayFunding({ balance = 0, fundings = [], transactions = [] }) {
    const { flash, errors } = usePage().props;
    const [verifyingId, setVerifyingId] = useState(null);
    const [checkoutFunding, setCheckoutFunding] = useState(null);

    // Auto-open the checkout the moment a new funding request is created.
    useEffect(() => {
        if (flash?.checkoutFunding) {
            setCheckoutFunding(flash.checkoutFunding);
        }
    }, [flash?.checkoutFunding]);

    const verify = (id) => {
        setVerifyingId(id);
        router.post(route('admin.easigateway-funding.verify', id), {}, {
            preserveScroll: true,
            onFinish: () => setVerifyingId(null),
        });
    };

    return (
        <AdminLayout title="Wallet Funding">
            {checkoutFunding && (
                <CheckoutModal funding={checkoutFunding} onClose={() => setCheckoutFunding(null)} />
            )}

            <div className="max-w-5xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">EasiGateway Wallet Funding</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Fund the wallet used to send airtime, and monitor its balance.</p>
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

                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-sm p-6 text-white">
                    <p className="text-xs text-indigo-200">Current Wallet Balance (tracked internally)</p>
                    <p className="text-3xl font-bold mt-1">{formatNaira(balance)}</p>
                </div>

                <FundForm />

                {/* Pending / recent fundings */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800">Funding Requests</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{fundings.length} request{fundings.length !== 1 ? 's' : ''}</p>
                    </div>

                    {fundings.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No funding requests yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Amount', 'Bank', 'Account Number', 'Account Name', 'Status', 'Created', 'Actions'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {fundings.map((f) => (
                                        <tr key={f.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <p className="text-sm font-medium text-gray-800">{formatNaira(f.amount)}</p>
                                                {f.total_amount && Number(f.total_amount) !== Number(f.amount) && (
                                                    <p className="text-xs text-gray-400">transfer {formatNaira(f.total_amount)}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{f.bank_name ?? '—'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{f.account_number ?? '—'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{f.account_name ?? '—'}</td>
                                            <td className="px-5 py-3 whitespace-nowrap"><StatusBadge status={f.status} /></td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(f.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                {f.status === 'pending' ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setCheckoutFunding(f)}
                                                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
                                                        >
                                                            Checkout
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => verify(f.id)}
                                                            disabled={verifyingId === f.id}
                                                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition"
                                                        >
                                                            {verifyingId === f.id ? 'Checking…' : 'Verify'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-300">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Balance ledger */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800">Balance History</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Every credit (funding) and debit (airtime spend), most recent first.</p>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No wallet activity yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Type', 'Description', 'Amount', 'Balance After', 'Date'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {transactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${
                                                    t.type === 'credit' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                                                }`}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600 max-w-xs truncate" title={t.description}>{t.description}</td>
                                            <td className={`px-5 py-3 text-sm font-medium whitespace-nowrap ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                {t.type === 'credit' ? '+' : '-'}{formatNaira(t.amount)}
                                            </td>
                                            <td className="px-5 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">{formatNaira(t.balance_after)}</td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(t.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
