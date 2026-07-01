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

function FileMaintenanceCard() {
    const [status, setStatus] = useState('idle'); // idle | running | done | error
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
    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState(null);

    const run = async () => {
        setStatus('running');
        setResult(null);
        try {
            const { data } = await axios.post(route('admin.settings.compress-files'));
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
                <p>Scans all <span className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">.jpg</span>, <span className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">.jpeg</span>, and <span className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">.png</span> files in all upload folders and re-saves them at optimised quality (75% JPEG). Files already at optimal size are skipped.</p>
            </div>

            {result && status === 'done' && (
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-blue-700">{result.compressed}</p>
                            <p className="text-xs text-blue-600 mt-0.5">Compressed</p>
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

                    {result.savedTotal && result.compressed > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium text-center">
                            Total space saved: <span className="font-bold">{result.savedTotal}</span>
                        </div>
                    )}

                    {result.log?.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                            {result.log.map((entry, i) => (
                                <div key={i} className="px-4 py-2.5 text-xs flex items-center justify-between gap-2">
                                    <p className="text-gray-700 truncate flex-1">{entry.file}</p>
                                    <p className="text-gray-400 shrink-0">{entry.before} → <span className="text-green-600 font-medium">{entry.after}</span></p>
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
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
            >
                {status === 'running' ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Compressing images…
                    </span>
                ) : status === 'done' ? 'Run Again' : 'Compress Images'}
            </button>
        </div>
    );
}

export default function Settings({ registrationOpen, accessEnabled }) {
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

                <FileMaintenanceCard />

                <CompressFilesCard />

            </div>
        </AdminLayout>
    );
}
