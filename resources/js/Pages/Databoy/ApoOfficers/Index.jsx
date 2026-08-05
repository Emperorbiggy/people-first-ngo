import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { router, usePage } from '@inertiajs/react';
import DataboyLayout from '@/Layouts/DataboyLayout';
import PaystackService from '@/services/paystack';

const NETWORKS    = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
const EMPLOYMENT   = ['Employed', 'Unemployed', 'Student', 'Self-employed', 'Corp member', 'Recently passed out Corp member'];
const GRADE_LEVELS = Array.from({ length: 17 }, (_, i) => `Level ${i + 1}`);
const AVAILABILITY = [
    { value: 'all_opportunities', label: 'I am Available for all opportunities' },
    { value: 'southwest_travel',  label: 'Available for short-time contract work (travel within South West)' },
    { value: 'outside_state',     label: 'Available for 30-day contract work outside my state' },
    { value: 'not_available',     label: 'I am not available' },
];

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';
const errCls   = 'mt-1 text-xs text-red-600';

function Section({ title, children }) {
    return (
        <div className="border-b border-gray-100 pb-5 mb-5 last:border-b-0 last:mb-0 last:pb-0">
            <h4 className="font-semibold text-gray-800 text-sm mb-4">{title}</h4>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

function ReplaceModal({ application, pollingUnits, onClose }) {
    const [data, setDataState] = useState({
        full_name: application.full_name ?? '',
        gender: application.gender ?? '',
        age: application.age ?? '',
        email_address: application.email_address ?? '',
        calling_phone_number: application.calling_phone_number ?? '',
        whatsapp_number: application.whatsapp_number ?? '',
        polling_unit_id: application.polling_unit?.id ? String(application.polling_unit.id) : '',
        house_address: application.house_address ?? '',
        browsing_network: application.browsing_network ?? '',
        browsing_number: application.browsing_number ?? '',
        bank_name: application.bank_name ?? '',
        bank_code: application.bank_code ?? '',
        account_number: application.account_number ?? '',
        bank_account_name: application.bank_account_name ?? '',
        employment_status: application.employment_status ?? '',
        availability: application.availability ?? '',
        current_occupation: application.current_occupation ?? '',
        work_grade_level: application.work_grade_level ?? '',
        has_voter_card: !!application.has_voter_card,
    });
    const setData = (field, value) => setDataState((d) => ({ ...d, [field]: value }));

    const [banks, setBanks] = useState([]);
    const [resolving, setResolving] = useState(false);
    const [resolvedName, setResolvedName] = useState(application.bank_account_name ?? '');
    const [resolveError, setResolveError] = useState('');

    const [passportFile, setPassportFile] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

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
        setData('bank_name', name);
        setData('bank_code', bank?.code ?? '');
        if (data.account_number.length === 10 && bank?.code) {
            triggerResolve(data.account_number, bank.code);
        }
    };

    const triggerResolve = async (number, code) => {
        if (!number || !code || number.length < 10) return;
        setResolving(true);
        setResolvedName('');
        setResolveError('');
        setData('bank_account_name', '');
        try {
            const result = await PaystackService.resolveAccountNumber(number, code);
            if (result.status && result.data) {
                setResolvedName(result.data.account_name);
                setData('bank_account_name', result.data.account_name);
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
        setData('account_number', val);
        if (val.length === 10 && data.bank_code) {
            triggerResolve(val, data.bank_code);
        } else {
            setResolvedName('');
            setData('bank_account_name', '');
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
        setErrors({});
        router.post(route('databoy.apo-officers.replace', application.id), {
            ...data,
            has_voter_card: data.has_voter_card ? '1' : '0',
            passport_photograph: passportFile,
        }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (e) => { setErrors(e); setSaving(false); },
            onFinish: () => setSaving(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={!saving ? onClose : undefined} />
            <form onSubmit={submit} className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-800">Replace Registration Details</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Correcting {application.full_name}'s registration. ID card and certificate cannot be changed here.</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 overflow-y-auto">
                    {errors.account && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{errors.account}</p>}

                    <Section title="Personal Information">
                        <div>
                            <label className={labelCls}>Full Name *</label>
                            <input type="text" value={data.full_name} onChange={(e) => setData('full_name', e.target.value)} className={inputCls} />
                            {errors.full_name && <p className={errCls}>{errors.full_name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Gender *</label>
                                <select value={data.gender} onChange={(e) => setData('gender', e.target.value)} className={inputCls}>
                                    <option value="">Select gender</option>
                                    <option>Male</option><option>Female</option>
                                </select>
                                {errors.gender && <p className={errCls}>{errors.gender}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Age *</label>
                                <input type="number" min="18" max="60" value={data.age} onChange={(e) => setData('age', e.target.value)} className={inputCls} />
                                {errors.age && <p className={errCls}>{errors.age}</p>}
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Email Address *</label>
                            <input type="email" value={data.email_address} onChange={(e) => setData('email_address', e.target.value)} className={inputCls} />
                            {errors.email_address && <p className={errCls}>{errors.email_address}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Calling Phone Number *</label>
                                <input type="tel" value={data.calling_phone_number} onChange={(e) => setData('calling_phone_number', e.target.value)} className={inputCls} />
                                {errors.calling_phone_number && <p className={errCls}>{errors.calling_phone_number}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>WhatsApp Number *</label>
                                <input type="tel" value={data.whatsapp_number} onChange={(e) => setData('whatsapp_number', e.target.value)} className={inputCls} />
                                {errors.whatsapp_number && <p className={errCls}>{errors.whatsapp_number}</p>}
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>House Address *</label>
                            <textarea value={data.house_address} onChange={(e) => setData('house_address', e.target.value)} rows={2} className={inputCls} />
                            {errors.house_address && <p className={errCls}>{errors.house_address}</p>}
                        </div>
                    </Section>

                    <Section title="Location">
                        <div>
                            <label className={labelCls}>LGA</label>
                            <input type="text" value={application.lga?.name ?? '—'} readOnly className={`${inputCls} bg-gray-50 cursor-not-allowed text-gray-600 font-medium`} />
                        </div>
                        <div>
                            <label className={labelCls}>Ward</label>
                            <input type="text" value={application.ward?.name ?? '—'} readOnly className={`${inputCls} bg-gray-50 cursor-not-allowed text-gray-600 font-medium`} />
                        </div>
                        <div>
                            <label className={labelCls}>Polling Unit</label>
                            <select value={data.polling_unit_id} onChange={(e) => setData('polling_unit_id', e.target.value)} className={inputCls}>
                                <option value="">Select Polling Unit…</option>
                                {pollingUnits.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {errors.polling_unit_id && <p className={errCls}>{errors.polling_unit_id}</p>}
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={data.has_voter_card} onChange={(e) => setData('has_voter_card', e.target.checked)} className="accent-indigo-600 w-4 h-4" />
                            <span className="text-sm text-gray-700">Applicant has a Voter's Card</span>
                        </label>
                    </Section>

                    <Section title="Bank & Network Information">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Browsing Network *</label>
                                <select value={data.browsing_network} onChange={(e) => setData('browsing_network', e.target.value)} className={inputCls}>
                                    <option value="">Select network</option>
                                    {NETWORKS.map((n) => <option key={n}>{n}</option>)}
                                </select>
                                {errors.browsing_network && <p className={errCls}>{errors.browsing_network}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Browsing Number *</label>
                                <input type="tel" value={data.browsing_number} onChange={(e) => setData('browsing_number', e.target.value)} className={inputCls} />
                                {errors.browsing_number && <p className={errCls}>{errors.browsing_number}</p>}
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Bank *</label>
                            <select value={data.bank_name} onChange={(e) => handleBankChange(e.target.value)} className={inputCls}>
                                <option value="">{banks.length === 0 ? 'Loading banks…' : 'Select bank'}</option>
                                {banks.map((b) => <option key={b.code} value={b.name}>{b.name}</option>)}
                            </select>
                            {errors.bank_name && <p className={errCls}>{errors.bank_name}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Account Number *</label>
                                <div className="relative">
                                    <input type="text" maxLength={10} value={data.account_number}
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
                                {errors.account_number && <p className={errCls}>{errors.account_number}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Bank Account Name *</label>
                                <input type="text" value={data.bank_account_name} readOnly
                                    placeholder={resolving ? 'Verifying…' : 'Auto-filled after verification'}
                                    className={inputCls + ' cursor-default ' + (resolvedName ? 'text-green-700 bg-green-50' : 'bg-gray-50 text-gray-400')} />
                                {resolveError && <p className={errCls}>{resolveError}</p>}
                                {errors.bank_account_name && <p className={errCls}>{errors.bank_account_name}</p>}
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Employment Status *</label>
                            <select value={data.employment_status} onChange={(e) => setData('employment_status', e.target.value)} className={inputCls}>
                                <option value="">Select employment status</option>
                                {EMPLOYMENT.map((s) => <option key={s}>{s}</option>)}
                            </select>
                            {errors.employment_status && <p className={errCls}>{errors.employment_status}</p>}
                        </div>

                        {(data.employment_status === 'Employed' || data.employment_status === 'Self-employed') && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Current Occupation</label>
                                    <input type="text" value={data.current_occupation} onChange={(e) => setData('current_occupation', e.target.value)} className={inputCls} />
                                </div>
                                {data.employment_status === 'Employed' && (
                                    <div>
                                        <label className={labelCls}>Work Grade Level</label>
                                        <select value={data.work_grade_level} onChange={(e) => setData('work_grade_level', e.target.value)} className={inputCls}>
                                            <option value="">Select grade level</option>
                                            {GRADE_LEVELS.map((l) => <option key={l}>{l}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label className={labelCls}>Availability for Contract Work</label>
                            <div className="space-y-2">
                                {AVAILABILITY.map((a) => (
                                    <label key={a.value} className="flex items-start gap-3 cursor-pointer">
                                        <input type="radio" name="availability" value={a.value}
                                            checked={data.availability === a.value}
                                            onChange={() => setData('availability', a.value)}
                                            className="mt-0.5 accent-indigo-600" />
                                        <span className="text-sm text-gray-700">{a.label}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.availability && <p className={errCls}>{errors.availability}</p>}
                        </div>
                    </Section>

                    <Section title="Passport Photograph (optional)">
                        <p className="text-xs text-gray-400 -mt-2">Leave blank to keep the current passport photo.</p>
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
                        {errors.passport_photograph && <p className={errCls}>{errors.passport_photograph}</p>}
                    </Section>
                </div>

                <div className="p-5 border-t border-gray-100 flex gap-3 shrink-0">
                    <button type="button" onClick={onClose} disabled={saving}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
                        {saving ? 'Saving…' : 'Replace Details'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function Index({ applications = [], pollingUnits = [] }) {
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
                <ReplaceModal application={replacingApp} pollingUnits={pollingUnits} onClose={() => setReplacingApp(null)} />
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
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">
                                            {app.full_name}
                                            {app.is_replaced && app.apo_officer?.previous_full_name && (
                                                <span className="ml-1 text-xs font-normal text-gray-400">(Replaced: {app.apo_officer.previous_full_name})</span>
                                            )}
                                        </td>
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
