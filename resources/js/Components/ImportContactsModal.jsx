import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import PhoneNumberPicker from '@/Components/PhoneNumberPicker';

const NETWORKS = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];

const formatNaira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

/**
 * Buy airtime for numbers that aren't databoys — typed in directly or imported
 * from a sheet. The parent page owns nothing here; this posts on its own.
 */
export default function ImportContactsModal({ onClose, defaultAmount = 0, balance = 0 }) {
    const { errors } = usePage().props;
    const [numbers, setNumbers] = useState([]);
    const [network, setNetwork] = useState('MTN');
    const [amount, setAmount] = useState(defaultAmount || '');
    const [uploading, setUploading] = useState(false);
    const [busy, setBusy] = useState(false);

    const upload = (file) => {
        setUploading(true);
        router.post(route('admin.airtime.import.preview'), { file }, {
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

    const value = Number(amount) || 0;
    const total = value * numbers.length;
    // The jobs refuse an unaffordable purchase too; catching it here means one
    // clear message instead of a stream of failed rows in the history.
    const overBalance = total > balance;
    const affordable = value > 0 ? Math.floor(balance / value) : 0;

    const send = () => {
        if (numbers.length === 0 || value <= 0 || overBalance) return;

        if (!confirm(
            `Buy ${formatNaira(value)} ${network} airtime for ${numbers.length} number(s)?\n\nTotal: ${formatNaira(total)}`
        )) return;

        setBusy(true);
        router.post(route('admin.airtime.import.send'), {
            network, amount: value, phone_numbers: numbers,
        }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setBusy(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-gray-800">Buy Airtime for Contacts</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Type the numbers or import a list</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                <div className="p-6 space-y-5">
                    <PhoneNumberPicker
                        numbers={numbers}
                        onChange={setNumbers}
                        onUpload={upload}
                        uploading={uploading}
                        error={errors?.import}
                    />

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Network</label>
                        <div className="grid grid-cols-4 gap-2">
                            {NETWORKS.map((n) => (
                                <button key={n} type="button" onClick={() => setNetwork(n)}
                                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition ${
                                        network === n ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}>
                                    {n}
                                </button>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-400">Every number in the list is topped up on this network.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Amount per number</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₦</span>
                            <input type="number" min="1" step="0.01" value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="e.g. 500"
                                className="w-full pl-7 pr-3 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                            Total: <span className="font-bold text-gray-700">{formatNaira(total)}</span>
                            <span className="text-gray-400"> · balance {formatNaira(balance)}</span>
                        </p>

                        {overBalance && (
                            <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                Not enough balance — {formatNaira(total)} needed, {formatNaira(balance)} available.
                                That covers {affordable} number{affordable === 1 ? '' : 's'}.
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2.5">
                        <button onClick={onClose} disabled={busy}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition">
                            Cancel
                        </button>
                        <button onClick={send} disabled={busy || numbers.length === 0 || value <= 0 || overBalance}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 transition">
                            {busy ? 'Queueing…' : `Send to ${numbers.length}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
