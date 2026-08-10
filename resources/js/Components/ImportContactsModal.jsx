import { useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

const NETWORKS = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];

const formatNaira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

/**
 * Upload a CSV/Excel of phone numbers, pick the network, buy airtime for all of
 * them. Numbers are previewed and editable before anything is sent.
 */
export default function ImportContactsModal({ onClose, defaultAmount = 0 }) {
    const { errors } = usePage().props;
    const [file, setFile] = useState(null);
    const [numbers, setNumbers] = useState(null);
    const [network, setNetwork] = useState('MTN');
    const [amount, setAmount] = useState(defaultAmount || '');
    const [busy, setBusy] = useState(false);
    const inputRef = useRef(null);

    const upload = (e) => {
        e.preventDefault();
        if (!file) return;

        setBusy(true);
        router.post(route('admin.airtime.import.preview'), { file }, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                const imported = page.props.flash?.importedContacts;
                if (imported?.numbers) setNumbers(imported.numbers);
            },
            onFinish: () => setBusy(false),
        });
    };

    const drop = (n) => setNumbers((list) => list.filter((x) => x !== n));

    const send = () => {
        const value = Number(amount) || 0;
        if (!numbers?.length || value <= 0) return;

        if (!confirm(
            `Buy ${formatNaira(value)} ${network} airtime for ${numbers.length} number(s)?\n\n` +
            `Total: ${formatNaira(value * numbers.length)}`
        )) return;

        setBusy(true);
        router.post(route('admin.airtime.import.send'), {
            network,
            amount: value,
            phone_numbers: numbers,
        }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setBusy(false),
        });
    };

    const total = (Number(amount) || 0) * (numbers?.length || 0);

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-gray-800">Import Contacts</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Buy airtime for a list of phone numbers</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                <div className="p-6 space-y-5">
                    {errors?.import && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">{errors.import}</div>
                    )}

                    {!numbers ? (
                        <form onSubmit={upload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Contact File</label>
                                <div
                                    onClick={() => inputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl px-4 py-8 text-center cursor-pointer transition ${
                                        file ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <input
                                        ref={inputRef} type="file" className="hidden"
                                        accept=".csv,.txt,.xlsx,.xls,.ods"
                                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                    />
                                    {file ? (
                                        <>
                                            <p className="text-sm font-semibold text-gray-800 break-all">{file.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">click to choose a different file</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm font-semibold text-gray-700">Choose a CSV or Excel file</p>
                                            <p className="text-xs text-gray-400 mt-1">Needs one column: <span className="font-mono">Phone Number</span></p>
                                        </>
                                    )}
                                </div>
                                <p className="mt-2 text-xs text-gray-400">
                                    Headings like Phone, Mobile or Number also work. No heading? The first column is used.
                                </p>
                            </div>

                            <button type="submit" disabled={!file || busy}
                                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 transition">
                                {busy ? 'Reading file…' : 'Read Numbers'}
                            </button>
                        </form>
                    ) : (
                        <>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                                <p className="text-sm font-bold text-emerald-900">{numbers.length} number(s) found</p>
                                <p className="text-xs text-emerald-700/80 mt-0.5">Remove any you don't want before sending.</p>
                            </div>

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
                                <p className="mt-2 text-xs text-gray-400">All imported numbers are topped up on this network.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Amount per number</label>
                                <input
                                    type="number" min="1" value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="e.g. 500"
                                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    Total: <span className="font-bold text-gray-700">{formatNaira(total)}</span>
                                </p>
                            </div>

                            <div className="border border-gray-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-gray-50">
                                {numbers.map((n) => (
                                    <div key={n} className="px-3 py-2 flex items-center justify-between">
                                        <span className="text-sm text-gray-700 tabular-nums">{n}</span>
                                        <button onClick={() => drop(n)} className="text-xs font-semibold text-red-500 hover:text-red-700">Remove</button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2.5">
                                <button onClick={() => { setNumbers(null); setFile(null); }} disabled={busy}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition">
                                    Choose another file
                                </button>
                                <button onClick={send} disabled={busy || numbers.length === 0 || (Number(amount) || 0) <= 0}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 transition">
                                    {busy ? 'Queueing…' : `Send to ${numbers.length}`}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
