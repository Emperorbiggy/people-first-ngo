import { useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import PhoneNumberPicker from '@/Components/PhoneNumberPicker';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

export default function ManualAirtimePurchase({ networks = [], balance = 0, defaultAmount = 0, recent = [] }) {
    const { flash, errors } = usePage().props;
    const [numbers, setNumbers] = useState([]);
    const [network, setNetwork] = useState(networks[0] ?? 'MTN');
    const [amount, setAmount] = useState(defaultAmount || '');
    const [uploading, setUploading] = useState(false);
    const [busy, setBusy] = useState(false);

    const value = Number(amount) || 0;
    const total = value * numbers.length;

    const upload = (file) => {
        setUploading(true);
        router.post(route('admin.manual-airtime-purchase.preview'), { file }, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                const imported = page.props.flash?.importedContacts;
                if (imported?.numbers) {
                    setNumbers((prev) => [...new Set([...prev, ...imported.numbers])]);
                }
            },
            onFinish: () => setUploading(false),
        });
    };

    const record = () => {
        if (numbers.length === 0 || value <= 0) return;
        if (!confirm(
            `Record ${numbers.length} airtime purchase(s) of ${naira(value)} on ${network} as already bought?\n\n` +
            `This sends NOTHING to EasiGateway. It writes the purchase history and debits ${naira(total)} from the tracked balance.`
        )) return;

        setBusy(true);
        router.post(route('admin.manual-airtime-purchase.store'), {
            network, amount: value, phone_numbers: numbers,
        }, {
            preserveScroll: true,
            onSuccess: () => setNumbers([]),
            onFinish: () => setBusy(false),
        });
    };

    return (
        <AdminLayout title="Manual Airtime Purchase">
            <div className="max-w-3xl mx-auto space-y-5">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Manual Airtime Purchase</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        For airtime you already sent by hand. Records it and debits the balance without calling EasiGateway.
                    </p>
                </div>

                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3">
                    <p className="text-sm font-bold text-amber-900">Nothing is purchased here</p>
                    <p className="text-xs text-amber-800/80 mt-1">
                        No airtime is sent. This writes the same records a real purchase writes, so history and the tracked
                        balance match what you bought manually. To actually buy airtime, use{' '}
                        <Link href={route('admin.airtime')} className="font-semibold underline">Send Airtime</Link>.
                    </p>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone Numbers</label>
                        <PhoneNumberPicker
                            numbers={numbers}
                            onChange={setNumbers}
                            onUpload={upload}
                            uploading={uploading}
                            error={errors?.import}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Network</label>
                        <div className="grid grid-cols-4 gap-2">
                            {networks.map((n) => (
                                <button key={n} type="button" onClick={() => setNetwork(n)}
                                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition ${
                                        network === n ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}>
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Amount per number</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₦</span>
                            <input type="number" min="1" step="0.01" value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-7 pr-3 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        {errors?.amount && <p className="mt-1.5 text-xs text-red-600">{errors.amount}</p>}
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap border-t border-gray-100 pt-4">
                        <div className="text-sm text-gray-600">
                            <p>Tracked balance: <span className="font-bold text-gray-800">{naira(balance)}</span></p>
                            <p>{numbers.length} number(s) · will debit <span className="font-bold text-gray-800">{naira(total)}</span></p>
                        </div>
                        <button onClick={record} disabled={busy || numbers.length === 0 || value <= 0}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded-xl transition">
                            {busy ? 'Recording…' : `Record ${numbers.length} as Purchased`}
                        </button>
                    </div>
                </div>

                {recent.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-800">Recent imported/manual airtime</p>
                            <Link href={route('admin.airtime.history')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                                Full history →
                            </Link>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {recent.map((r) => (
                                <div key={r.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                                    <span className="text-gray-700 tabular-nums">{r.phone_number}</span>
                                    <span className="text-gray-500">{r.network}</span>
                                    <span className="text-gray-700">{naira(r.amount)}</span>
                                    <span className={`text-xs font-semibold ${r.status === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>{r.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
