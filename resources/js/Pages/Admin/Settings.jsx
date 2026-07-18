import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/Layouts/AdminLayout';

function SettingRow({ label, description, enabled, settingKey, statusOn, statusOff, colorOn = 'green', colorOff = 'red' }) {
    const [value, setValue] = useState(enabled);

    const toggle = (next) => {
        setValue(next);
        router.post(route('admin.settings.update'), { key: settingKey, value: next }, { preserveScroll: true });
    };

    const colors = {
        green: 'bg-green-50 border-green-200 text-green-700',
        red:   'bg-red-50 border-red-200 text-red-700',
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                    <p className="font-semibold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
                <button
                    type="button"
                    onClick={() => toggle(!value)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        value ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        value ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                </button>
            </div>
            <div className={`rounded-xl px-4 py-2.5 text-sm font-medium border ${value ? colors[colorOn] : colors[colorOff]}`}>
                {value ? statusOn : statusOff}
            </div>
        </div>
    );
}

function PaymentGatewaySection({ paymentGateway, paystackPublicKey, paystackSecretKeySet, easigatewayAppKeySet, bulkTransferAmount, applicantTransferAmount }) {
    const [gateway, setGateway] = useState(paymentGateway || 'paystack');
    const [secretKey, setSecretKey] = useState('');
    const [publicKey, setPublicKey] = useState(paystackPublicKey || '');
    const [appKey, setAppKey] = useState('');
    const [transferAmount, setTransferAmount] = useState(bulkTransferAmount || '');
    const [applicantAmount, setApplicantAmount] = useState(applicantTransferAmount || '');
    const [showSecret, setShowSecret] = useState(false);
    const [showAppKey, setShowAppKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedFlags, setSavedFlags] = useState({ paystackSecretKeySet, easigatewayAppKeySet });

    const save = () => {
        setSaving(true);
        router.post(route('admin.settings.payment-gateway'), {
            gateway,
            paystack_secret_key: secretKey,
            paystack_public_key: publicKey,
            easigateway_app_key: appKey,
            bulk_transfer_amount: transferAmount,
            applicant_transfer_amount: applicantAmount,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSavedFlags({
                    paystackSecretKeySet: savedFlags.paystackSecretKeySet || secretKey.length > 0,
                    easigatewayAppKeySet: savedFlags.easigatewayAppKeySet || appKey.length > 0,
                });
                setSecretKey('');
                setAppKey('');
            },
            onFinish: () => setSaving(false),
        });
    };

    const gateways = [
        { key: 'paystack', label: 'Paystack', description: 'Card payments and bulk bank transfers via Paystack.' },
        { key: 'easigateway', label: 'Easigateway', description: 'Payments and payouts via Easigateway.' },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
                <p className="font-semibold text-gray-800">Payment Gateway</p>
                <p className="text-xs text-gray-500 mt-0.5">Choose which gateway processes payments and transfers.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gateways.map((g) => (
                    <button
                        key={g.key}
                        type="button"
                        onClick={() => setGateway(g.key)}
                        className={`text-left rounded-xl border p-4 transition ${
                            gateway === g.key
                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <p className="font-semibold text-sm text-gray-800">{g.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>
                    </button>
                ))}
            </div>

            {gateway === 'paystack' && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div>
                        <label className="text-xs font-medium text-gray-600">Secret Key</label>
                        <div className="relative mt-1">
                            <input
                                type={showSecret ? 'text' : 'password'}
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                placeholder={savedFlags.paystackSecretKeySet ? 'A key is already saved — leave blank to keep it' : 'sk_live_...'}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSecret(!showSecret)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                            >
                                {showSecret ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600">Public Key</label>
                        <input
                            type="text"
                            value={publicKey}
                            onChange={(e) => setPublicKey(e.target.value)}
                            placeholder="pk_live_..."
                            className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600">Bulk Transfer Amount</label>
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₦</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full rounded-xl border border-gray-200 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Amount paid to each databoy when a bulk transfer is run.</p>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600">Applicant Transfer Amount</label>
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₦</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={applicantAmount}
                                onChange={(e) => setApplicantAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full rounded-xl border border-gray-200 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Amount paid to each applicant when an applicant bulk transfer is run.</p>
                    </div>
                </div>
            )}

            {gateway === 'easigateway' && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div>
                        <label className="text-xs font-medium text-gray-600">App Key</label>
                        <div className="relative mt-1">
                            <input
                                type={showAppKey ? 'text' : 'password'}
                                value={appKey}
                                onChange={(e) => setAppKey(e.target.value)}
                                placeholder={savedFlags.easigatewayAppKeySet ? 'A key is already saved — leave blank to keep it' : 'Enter app key'}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowAppKey(!showAppKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                            >
                                {showAppKey ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={save}
                disabled={saving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
            >
                {saving ? 'Saving…' : 'Save Payment Gateway Settings'}
            </button>
        </div>
    );
}

function AirtimeSettingsSection({ airtimeAmount, paymentGateway }) {
    const [amount, setAmount] = useState(airtimeAmount || '');
    const [saving, setSaving] = useState(false);

    const save = () => {
        setSaving(true);
        router.post(route('admin.settings.payment-gateway'), {
            gateway: paymentGateway || 'paystack',
            airtime_amount: amount,
        }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
                <p className="font-semibold text-gray-800">Airtime (EasiGateway)</p>
                <p className="text-xs text-gray-500 mt-0.5">Amount of airtime sent to each databoy's registered network number.</p>
            </div>
            <div>
                <label className="text-xs font-medium text-gray-600">Airtime Amount</label>
                <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₦</span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-gray-200 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-1">Airtime credentials (API key, URL) are configured via .env, not here.</p>
            </div>
            <button
                type="button"
                onClick={save}
                disabled={saving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
            >
                {saving ? 'Saving…' : 'Save Airtime Amount'}
            </button>
        </div>
    );
}

function FileMaintenanceCard() {
    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState(null);

    const run = async () => {
        setStatus('running');
        setResult(null);
        try {
            const { data } = await axios.post(route('admin.settings.rename-files'));
            setResult(data);
            setStatus('done');
        } catch (e) {
            setResult({ error: e?.response?.data?.message ?? 'Something went wrong.' });
            setStatus('error');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <div>
                    <p className="font-semibold text-gray-800 text-sm">File Name Maintenance</p>
                    <p className="text-xs text-gray-500">Rename existing NGO application files to use spaces instead of hyphens and underscores</p>
                </div>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-600 space-y-1">
                <p className="font-medium text-gray-700">What this does:</p>
                <p>Scans all uploaded files in the <span className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">ngo-applications</span> folder.</p>
                <p className="pt-1">Renames files from old format:</p>
                <p className="font-mono text-red-600">akinmade-akintoye_4232_passport.jpg</p>
                <p>To new format:</p>
                <p className="font-mono text-green-600">akinmade akintoye 4232 passport.jpg</p>
                <p className="pt-1 text-gray-500">Database records are updated automatically.</p>
            </div>

            {result && status === 'done' && (
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-green-700">{result.renamed}</p>
                            <p className="text-xs text-green-600 mt-0.5">Renamed</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-gray-600">{result.skipped}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Skipped</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-red-600">{result.errors?.length ?? 0}</p>
                            <p className="text-xs text-red-500 mt-0.5">Errors</p>
                        </div>
                    </div>

                    {result.log?.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                            {result.log.map((entry, i) => (
                                <div key={i} className="px-4 py-2.5 text-xs">
                                    <p className="text-red-500 line-through truncate">{entry.old}</p>
                                    <p className="text-green-600 truncate mt-0.5">→ {entry.new}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {result.errors?.length > 0 && (
                        <div className="border border-red-200 rounded-xl divide-y divide-red-50 max-h-32 overflow-y-auto">
                            {result.errors.map((err, i) => (
                                <p key={i} className="px-4 py-2 text-xs text-red-600">{err}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {status === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                    {result?.error}
                </div>
            )}

            <button
                type="button"
                onClick={run}
                disabled={status === 'running'}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
            >
                {status === 'running' ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Renaming files…
                    </span>
                ) : status === 'done' ? 'Run Again' : 'Rename Existing Files'}
            </button>
        </div>
    );
}

function CompressFilesCard() {
    const LIMIT = 10;
    const [status, setStatus]           = useState('idle');
    const [progress, setProgress]       = useState({ done: 0, total: 0 });
    const [accumulated, setAccumulated] = useState({ compressed: 0, skipped: 0, errors: [], log: [], savedBytes: 0 });

    const run = async () => {
        setStatus('running');
        setProgress({ done: 0, total: 0 });
        setAccumulated({ compressed: 0, skipped: 0, errors: [], log: [], savedBytes: 0 });

        let offset = 0;
        let totals = { compressed: 0, skipped: 0, errors: [], log: [], savedBytes: 0 };

        try {
            while (true) {
                const { data } = await axios.post(route('admin.settings.compress-files'), { offset, limit: LIMIT });

                totals.compressed += data.compressed;
                totals.skipped    += data.skipped;
                totals.savedBytes += data.savedBytes ?? 0;
                totals.errors      = [...totals.errors, ...(data.errors ?? [])];
                totals.log         = [...totals.log,    ...(data.log ?? [])];

                setProgress({ done: offset + (data.log?.length ?? 0) + (data.skipped ?? 0) + (data.errors?.length ?? 0), total: data.total });
                setAccumulated({ ...totals });

                if (data.done) break;
                offset += LIMIT;
            }
            setStatus('done');
        } catch (e) {
            setAccumulated((prev) => ({ ...prev, errors: [...prev.errors, e?.response?.data?.message ?? 'Request failed'] }));
            setStatus('error');
        }
    };

    const pct = progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;

    const formatBytes = (b) => {
        if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
        if (b >= 1024)    return (b / 1024).toFixed(1) + ' KB';
        return b + ' B';
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                </div>
                <div>
                    <p className="font-semibold text-gray-800 text-sm">Image Compression</p>
                    <p className="text-xs text-gray-500">Reduce file sizes of uploaded images while maintaining quality</p>
                </div>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-600 space-y-1">
                <p className="font-medium text-gray-700">What this does:</p>
                <p>Scans all <span className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">.jpg</span>, <span className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">.jpeg</span>, and <span className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">.png</span> files across all three upload folders and re-saves them at optimised quality (75% JPEG). Processed in batches of {LIMIT} to avoid server timeouts.</p>
                <p className="pt-1 font-medium text-gray-700">Folders included:</p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {['ngo-applications', 'databoy-applications', 'databoy'].map((f) => (
                        <span key={f} className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">{f}</span>
                    ))}
                </div>
            </div>

            {status === 'running' && (
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Processing batch…</span>
                        {progress.total > 0 && <span>{progress.done} / {progress.total}</span>}
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                            className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    {accumulated.compressed > 0 && (
                        <p className="text-xs text-blue-600">{accumulated.compressed} compressed so far, {formatBytes(accumulated.savedBytes)} saved</p>
                    )}
                </div>
            )}

            {(status === 'done' || (status === 'error' && accumulated.compressed > 0)) && (
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-blue-700">{accumulated.compressed}</p>
                            <p className="text-xs text-blue-600 mt-0.5">Compressed</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-gray-600">{accumulated.skipped}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Skipped</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-red-600">{accumulated.errors.length}</p>
                            <p className="text-xs text-red-500 mt-0.5">Errors</p>
                        </div>
                    </div>

                    {accumulated.compressed > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium text-center">
                            Total space saved: <span className="font-bold">{formatBytes(accumulated.savedBytes)}</span>
                        </div>
                    )}

                    {accumulated.log.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                            {accumulated.log.map((entry, i) => (
                                <div key={i} className="px-4 py-2.5 text-xs flex items-center justify-between gap-2">
                                    <p className="text-gray-700 truncate flex-1">{entry.file}</p>
                                    <p className="text-gray-400 shrink-0">{entry.before} → <span className="text-green-600 font-medium">{entry.after}</span></p>
                                </div>
                            ))}
                        </div>
                    )}

                    {accumulated.errors.length > 0 && (
                        <div className="border border-red-200 rounded-xl divide-y divide-red-50 max-h-32 overflow-y-auto">
                            {accumulated.errors.map((err, i) => (
                                <p key={i} className="px-4 py-2 text-xs text-red-600">{err}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={run}
                disabled={status === 'running'}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
            >
                {status === 'running' ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Compressing… {pct > 0 ? `${pct}%` : ''}
                    </span>
                ) : status === 'done' ? 'Run Again' : 'Compress Images'}
            </button>
        </div>
    );
}

export default function Settings({
    registrationOpen,
    accessEnabled,
    paymentGateway,
    paystackPublicKey,
    paystackSecretKeySet,
    easigatewayAppKeySet,
    bulkTransferAmount,
    applicantTransferAmount,
    airtimeAmount,
}) {
    const { flash } = usePage().props;

    return (
        <AdminLayout title="Settings">
            <div className="max-w-xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Settings</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Control databoy registration, application access, and file maintenance.</p>
                </div>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                        {flash.success}
                    </div>
                )}

                <SettingRow
                    label="Databoy Registration"
                    description="Controls whether the public /databoy/register page accepts new registrations."
                    settingKey="databoy_registration_open"
                    enabled={registrationOpen}
                    statusOn="Registration is OPEN — databoys can register."
                    statusOff="Registration is CLOSED — the form shows a closed message."
                    colorOn="green"
                    colorOff="red"
                />

                <SettingRow
                    label="Databoy Account Access"
                    description="When disabled, no databoy can open the application creation form, regardless of their individual account."
                    settingKey="databoy_access_enabled"
                    enabled={accessEnabled}
                    statusOn="Access is ENABLED — databoys can create applications."
                    statusOff="Access is DISABLED — all databoys are blocked from creating applications."
                    colorOn="green"
                    colorOff="red"
                />

                <PaymentGatewaySection
                    paymentGateway={paymentGateway}
                    paystackPublicKey={paystackPublicKey}
                    paystackSecretKeySet={paystackSecretKeySet}
                    easigatewayAppKeySet={easigatewayAppKeySet}
                    bulkTransferAmount={bulkTransferAmount}
                    applicantTransferAmount={applicantTransferAmount}
                />

                <AirtimeSettingsSection
                    airtimeAmount={airtimeAmount}
                    paymentGateway={paymentGateway}
                />

                <FileMaintenanceCard />

                <CompressFilesCard />

            </div>
        </AdminLayout>
    );
}
