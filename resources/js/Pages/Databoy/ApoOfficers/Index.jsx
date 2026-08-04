import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { router, usePage } from '@inertiajs/react';
import DataboyLayout from '@/Layouts/DataboyLayout';
import PaystackService from '@/services/paystack';

function ReplaceModal({ application, onClose }) {
    const [fullName, setFullName] = useState(application.full_name ?? '');
    const [banks, setBanks] = useState([]);
    const [bankName, setBankName] = useState(application.bank_name ?? '');
    const [bankCode, setBankCode] = useState(application.bank_code ?? '');
    const [accountNumber, setAccountNumber] = useState(application.account_number ?? '');
    const [accountName, setAccountName] = useState(application.bank_account_name ?? '');
    const [resolving, setResolving] = useState(false);
    const [resolveError, setResolveError] = useState('');
    const [passportFile, setPassportFile] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Camera capture state
    const [showCamera, setShowCamera] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const [facingMode, setFacingMode] = useState('user');
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const retryRef = useRef(null);
    const passportRef = useRef();

    useEffect(() => {
        PaystackService.fetchBanks()
            .then((list) => setBanks(Array.isArray(list) ? list : []))
            .catch(() => {});
    }, []);

    const handleBankChange = (name) => {
        const bank = banks.find((b) => b.name === name);
        setBankName(name);
        setBankCode(bank?.code ?? '');
        if (accountNumber.length === 10 && bank?.code) {
            triggerResolve(accountNumber, bank.code);
        }
    };

    const triggerResolve = async (number, code) => {
        if (!number || !code || number.length < 10) return;
        setResolving(true);
        setAccountName('');
        setResolveError('');
        try {
            const result = await PaystackService.resolveAccountNumber(number, code);
            if (result.status && result.data) {
                setAccountName(result.data.account_name);
            } else {
                setResolveError(result.message || 'Could not verify account. Please check the details.');
            }
        } catch {
            setResolveError('Network error. Please try again.');
        } finally {
            setResolving(false);
        }
    };

    const handleAccountNumberChange = (value) => {
        const val = value.replace(/\D/g, '').slice(0, 10);
        setAccountNumber(val);
        if (val.length === 10 && bankCode) {
            triggerResolve(val, bankCode);
        } else {
            setAccountName('');
            setResolveError('');
        }
    };

    const releaseStream = () => {
        if (retryRef.current) clearTimeout(retryRef.current);
        if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    const acquireCamera = useCallback(async (facing, attempt = 0) => {
        releaseStream();
        setCameraError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
            streamRef.current = stream;
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
            setCameraReady(true);
        } catch (err) {
            if ((err.name === 'AbortError' || err.name === 'NotReadableError') && attempt < 4) {
                retryRef.current = setTimeout(() => acquireCamera(facing, attempt + 1), 700);
            } else if (err.name === 'NotAllowedError') {
                setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
            } else {
                setCameraError('Could not access camera. Please close other apps using the camera and try again.');
            }
        }
    }, []);

    useEffect(() => {
        if (showCamera) acquireCamera(facingMode);
        return () => { if (!showCamera) releaseStream(); };
    }, [showCamera, facingMode]);

    const startCamera = () => {
        setCameraError('');
        setCameraReady(false);
        setShowCamera(true);
    };

    const stopCamera = () => {
        releaseStream();
        setShowCamera(false);
        setCameraError('');
        setCameraReady(false);
    };

    const capturePhoto = useCallback(async () => {
        if (!videoRef.current || !streamRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const imageSrc = canvas.toDataURL('image/jpeg');
        const blob = await (await fetch(imageSrc)).blob();
        const file = new File([blob], 'passport.jpg', { type: 'image/jpeg' });
        setPassportFile(file);
        setCapturedImage(imageSrc);
        stopCamera();
    }, []);

    const clearCapturedImage = () => {
        setPassportFile(null);
        setCapturedImage(null);
    };

    const handleFile = (file) => {
        if (!file) return;
        setPassportFile(file);
        setCapturedImage(URL.createObjectURL(file));
    };

    const submit = (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        router.post(route('databoy.apo-officers.replace', application.id), {
            full_name: fullName,
            bank_name: bankName,
            bank_code: bankCode,
            account_number: accountNumber,
            bank_account_name: accountName,
            passport_photograph: passportFile,
        }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (e) => { setError(Object.values(e)[0] ?? 'Failed to replace details.'); setSaving(false); },
            onFinish: () => setSaving(false),
        });
    };

    const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white';
    const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={!saving ? onClose : undefined} />
            <form onSubmit={submit} className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-800">Replace APO Officer Details</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Updates the registration for {application.full_name}.</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                    {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

                    <div>
                        <label className={labelCls}>Full Name *</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
                    </div>

                    <div>
                        <label className={labelCls}>Bank *</label>
                        <select value={bankName} onChange={(e) => handleBankChange(e.target.value)} className={inputCls}>
                            <option value="">{banks.length === 0 ? 'Loading banks…' : 'Select bank'}</option>
                            {banks.map((b) => <option key={b.code} value={b.name}>{b.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelCls}>Account Number *</label>
                        <div className="relative">
                            <input type="text" maxLength={10} value={accountNumber}
                                onChange={(e) => handleAccountNumberChange(e.target.value)}
                                placeholder="10-digit account number" className={inputCls + (resolving ? ' pr-9' : '')} />
                            {resolving && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <svg className="w-4 h-4 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                </span>
                            )}
                        </div>
                        {resolveError && <p className="mt-1 text-xs text-red-600">{resolveError}</p>}
                    </div>

                    <div>
                        <label className={labelCls}>Account Name *</label>
                        <input type="text" value={accountName} readOnly
                            placeholder={resolving ? 'Verifying…' : 'Auto-filled after verification'}
                            className={inputCls + ' cursor-default ' + (accountName ? 'text-green-700 bg-green-50' : 'bg-gray-50 text-gray-400')} />
                    </div>

                    <div>
                        <label className={labelCls}>Passport Photograph (optional)</label>
                        <p className="text-xs text-gray-400 mb-2">Leave blank to keep the current passport photo.</p>
                        <div className="flex gap-2 mb-3">
                            <button type="button" onClick={startCamera}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition">
                                Take Photo
                            </button>
                            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition cursor-pointer">
                                Upload File
                                <input ref={passportRef} type="file" accept=".jpg,.jpeg,.png" className="hidden"
                                    onChange={(e) => handleFile(e.target.files[0])} />
                            </label>
                        </div>

                        {showCamera && createPortal(
                            <div className="fixed inset-0 bg-black/75 z-[9999] flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden">
                                    <div className="px-4 py-3 border-b flex items-center justify-between">
                                        <p className="font-semibold text-gray-800">Take Passport Photo</p>
                                        <button type="button" onClick={stopCamera} className="text-gray-400 hover:text-gray-700">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        {cameraError ? (
                                            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                                                <p className="text-red-600 text-sm font-medium mb-2">{cameraError}</p>
                                                <button type="button" onClick={() => acquireCamera(facingMode)} className="text-sm text-blue-600 underline">Try again</button>
                                            </div>
                                        ) : (
                                            <div className="relative bg-black rounded-xl overflow-hidden" style={{ minHeight: 240 }}>
                                                {!cameraReady && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                                                        <p className="text-white text-sm">Starting camera…</p>
                                                    </div>
                                                )}
                                                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl"
                                                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                                            </div>
                                        )}
                                        <div className="flex justify-center gap-2 mt-4 flex-wrap">
                                            <button type="button"
                                                onClick={() => { setCameraReady(false); setFacingMode((f) => (f === 'user' ? 'environment' : 'user')); }}
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition">
                                                Flip Camera
                                            </button>
                                            <button type="button" onClick={capturePhoto} disabled={!cameraReady}
                                                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
                                                Capture
                                            </button>
                                            <button type="button" onClick={stopCamera}
                                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        , document.body)}

                        {capturedImage ? (
                            <div className="flex justify-center">
                                <div className="relative inline-block">
                                    <img src={capturedImage} alt="New passport" className="w-28 h-28 object-cover rounded-xl border-2 border-green-400" />
                                    <button type="button" onClick={clearCapturedImage}
                                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ) : application.passport_photograph_path && (
                            <div className="flex justify-center">
                                <img src={`/storage/${application.passport_photograph_path}`} alt="Current passport"
                                    className="w-28 h-28 object-cover rounded-xl border-2 border-gray-200" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 flex gap-3 shrink-0">
                    <button type="button" onClick={onClose} disabled={saving}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving || !fullName || !accountName}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
                        {saving ? 'Saving…' : 'Replace Details'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function Index({ applications = [] }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [qualifyingId, setQualifyingId] = useState(null);
    const [replacingApp, setReplacingApp] = useState(null);

    const filtered = applications.filter((a) => {
        const q = search.toLowerCase();
        return (
            a.full_name?.toLowerCase().includes(q) ||
            a.calling_phone_number?.toLowerCase().includes(q) ||
            a.lga?.name?.toLowerCase().includes(q) ||
            a.ward?.name?.toLowerCase().includes(q)
        );
    });

    const qualify = (application) => {
        setQualifyingId(application.id);
        router.post(route('databoy.apo-officers.qualify', application.id), {}, {
            preserveScroll: true,
            onFinish: () => setQualifyingId(null),
        });
    };

    return (
        <DataboyLayout title="APO Officers">
            {replacingApp && (
                <ReplaceModal application={replacingApp} onClose={() => setReplacingApp(null)} />
            )}

            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-800">APO Officers</h1>
                <p className="text-sm text-gray-500 mt-0.5">Qualify your registrations as APO officers.</p>
            </div>

            {flash?.success && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium mb-5">
                    {flash.success}
                </div>
            )}

            {flash?.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium mb-5">
                    {flash.error}
                </div>
            )}

            <div className="relative mb-5">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, phone, LGA, ward…"
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="py-16 text-center text-sm text-gray-400">
                        {applications.length === 0 ? 'You have no registrations yet.' : 'No results found.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['#', 'Name', 'Phone', 'LGA', 'Ward', 'Status', 'Actions'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((app, i) => (
                                    <tr key={app.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{app.full_name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{app.calling_phone_number}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{app.lga?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{app.ward?.name ?? '—'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {app.apo_officer ? (
                                                <span className="inline-flex px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg">
                                                    Qualified APO
                                                </span>
                                            ) : (
                                                <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg">
                                                    Not Qualified
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {app.apo_officer ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setReplacingApp(app)}
                                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition"
                                                >
                                                    Replace
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => qualify(app)}
                                                    disabled={qualifyingId === app.id}
                                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition"
                                                >
                                                    {qualifyingId === app.id ? 'Qualifying…' : 'Qualify as APO'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DataboyLayout>
    );
}
