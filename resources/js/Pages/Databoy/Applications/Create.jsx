import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useForm, usePage } from '@inertiajs/react';
import DataboyLayout from '@/Layouts/DataboyLayout';
import axios from 'axios';
import PaystackService from '@/services/paystack';

const STATES = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
    'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe',
    'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara',
    'Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau',
    'Rivers','Sokoto','Taraba','Yobe','Zamfara',
];
const NETWORKS    = ['MTN','GLO','AIRTEL','9MOBILE'];
const EMPLOYMENT  = ['Employed','Unemployed','Student','Self-employed','Corp member','Recently passed out Corp member'];
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 text-base pb-3 border-b border-gray-100 mb-5">{title}</h3>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

function NotActive() {
    return (
        <DataboyLayout title="Not Active">
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-5">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Account Not Active Yet</h2>
                        <p className="text-sm text-gray-500 mt-2">
                            Your account is pending activation by the admin. Once activated, you will be able to register applicants.
                            Please check back later or contact your supervisor.
                        </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                        Contact admin to activate your databoy account.
                    </div>
                </div>
            </div>
        </DataboyLayout>
    );
}

function NoWard() {
    return (
        <DataboyLayout title="No Ward Assigned">
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-5">
                    <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">No Ward Assigned</h2>
                        <p className="text-sm text-gray-500 mt-2">
                            You do not have a ward assigned yet. Contact the admin to assign your ward before you can register applicants.
                        </p>
                    </div>
                    <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-800">
                        Contact admin to get your ward assigned.
                    </div>
                </div>
            </div>
        </DataboyLayout>
    );
}

export default function Create({ accessEnabled = true }) {
    const { databoy } = usePage().props;
    if (!accessEnabled) return <NotActive />;
    if (!databoy?.ward_id) return <NoWard />;
    const { data, setData, post, processing, errors } = useForm({
        full_name: '', gender: '', age: '', email_address: '',
        calling_phone_number: '', whatsapp_number: '',
        state_of_residence: 'Osun',
        lga_id: String(databoy?.lga_id ?? ''), ward_id: String(databoy?.ward_id ?? ''), polling_unit_id: '',
        house_address: '',
        browsing_network: '', browsing_number: '',
        bank_name: '', bank_code: '', account_number: '', bank_account_name: '',
        employment_status: '', availability: '',
        current_occupation: '', work_grade_level: '',
        has_voter_card: false,
        passport_photograph: null, valid_id_card: null, highest_qualification_certificate: null,
    });

    const [banks, setBanks]             = useState([]);
    const [resolving, setResolving]     = useState(false);
    const [resolvedName, setResolvedName] = useState('');
    const [resolveError, setResolveError] = useState('');

    // Camera / passport capture state
    const [showCamera, setShowCamera]         = useState(false);
    const [capturedImage, setCapturedImage]   = useState(null);
    const [cameraError, setCameraError]       = useState('');
    const [cameraReady, setCameraReady]       = useState(false);
    const [facingMode, setFacingMode]         = useState('user');
    const videoRef  = useRef(null);
    const streamRef = useRef(null);
    const retryRef  = useRef(null);

    // Polling units for the databoy's assigned ward
    const [pollingUnits, setPollingUnits] = useState([]);
    const [loadingPUs, setLoadingPUs]     = useState(false);

    const [passportName, setPassportName] = useState('');
    const [idCardName, setIdCardName]     = useState('');
    const [certName, setCertName]         = useState('');
    const passportRef = useRef();
    const idCardRef   = useRef();
    const certRef     = useRef();

    useEffect(() => {
        PaystackService.fetchBanks()
            .then((list) => setBanks(Array.isArray(list) ? list : []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!databoy?.ward_id) return;
        setLoadingPUs(true);
        axios.get(route('databoy.api.polling-units', { ward: databoy.ward_id }))
            .then(({ data: res }) => setPollingUnits(res))
            .catch(() => {})
            .finally(() => setLoadingPUs(false));
    }, [databoy?.ward_id]);

    const handleBankChange = (name) => {
        const bank = banks.find((b) => b.name === name);
        setData((d) => ({ ...d, bank_name: name, bank_code: bank?.code ?? '' }));
        if (data.account_number.length === 10 && bank?.code) {
            triggerResolve(data.account_number, bank.code);
        }
    };

    const triggerResolve = async (accountNumber, bankCode) => {
        if (!accountNumber || !bankCode || accountNumber.length < 10) return;
        setResolving(true);
        setResolvedName('');
        setResolveError('');
        setData('bank_account_name', '');
        try {
            const result = await PaystackService.resolveAccountNumber(accountNumber, bankCode);
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

    const clearAccount = () => {
        setData((d) => ({ ...d, account_number: '', bank_account_name: '' }));
        setResolvedName('');
        setResolveError('');
    };

    const releaseStream = () => {
        if (retryRef.current) clearTimeout(retryRef.current);
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
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
        document.body.style.overflow = 'hidden';
        setShowCamera(true);
    };

    const stopCamera = () => {
        releaseStream();
        setShowCamera(false);
        setCameraError('');
        setCameraReady(false);
        document.body.style.overflow = '';
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
        setData('passport_photograph', file);
        setCapturedImage(imageSrc);
        stopCamera();
    }, []);

    const clearCapturedImage = () => {
        setCapturedImage(null);
        setData('passport_photograph', null);
    };

    const handleFile = async (field, file, setName) => {
        if (!file) return;
        setData(field, file);
        if (setName) setName(file.name);
        if (field === 'passport_photograph') {
            setCapturedImage(URL.createObjectURL(file));
        }
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('databoy.applications.store'), { forceFormData: true });
    };

    return (
        <DataboyLayout title="Add Application">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-gray-800">Add Application</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Register an applicant for the NGO Contract Work Programme.</p>
                </div>

                <form onSubmit={submit} className="space-y-5">

                    {/* Personal Information */}
                    <Section title="Personal Information">
                        <div>
                            <label className={labelCls}>Full Name *</label>
                            <input type="text" value={data.full_name} onChange={(e) => setData('full_name', e.target.value)}
                                placeholder="Enter your full name as it appears on your ID" className={inputCls} />
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
                                <input type="number" min="18" max="60" value={data.age}
                                    onChange={(e) => setData('age', e.target.value)}
                                    placeholder="18–60" className={inputCls} />
                                {errors.age && <p className={errCls}>{errors.age}</p>}
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Email Address *</label>
                            <input type="email" value={data.email_address}
                                onChange={(e) => setData('email_address', e.target.value)}
                                placeholder="applicant@example.com" className={inputCls} />
                            {errors.email_address && <p className={errCls}>{errors.email_address}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Calling Phone Number *</label>
                                <input type="tel" value={data.calling_phone_number}
                                    onChange={(e) => setData('calling_phone_number', e.target.value)}
                                    placeholder="+234 800 000 0000" className={inputCls} />
                                {errors.calling_phone_number && <p className={errCls}>{errors.calling_phone_number}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>WhatsApp Number *</label>
                                <input type="tel" value={data.whatsapp_number}
                                    onChange={(e) => setData('whatsapp_number', e.target.value)}
                                    placeholder="+234 800 000 0000" className={inputCls} />
                                {errors.whatsapp_number && <p className={errCls}>{errors.whatsapp_number}</p>}
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>State of Residence *</label>
                            <input type="text" value="Osun" readOnly
                                className={`${inputCls} bg-gray-50 cursor-not-allowed text-gray-600 font-medium`} />
                            {errors.state_of_residence && <p className={errCls}>{errors.state_of_residence}</p>}
                        </div>

                        <div>
                            <label className={labelCls}>House Address *</label>
                            <textarea value={data.house_address}
                                onChange={(e) => setData('house_address', e.target.value)}
                                rows={2} placeholder="Enter complete residential address including street name, house number, and landmark"
                                className={inputCls} />
                            {errors.house_address && <p className={errCls}>{errors.house_address}</p>}
                        </div>
                    </Section>

                    {/* Location / Geo */}
                    <Section title="Location (LGA, Ward &amp; Polling Unit)">
                        <div>
                            <label className={labelCls}>State</label>
                            <input type="text" value="Osun" readOnly
                                className={`${inputCls} bg-gray-50 cursor-not-allowed text-gray-600 font-medium`} />
                        </div>

                        <div>
                            <label className={labelCls}>LGA</label>
                            <input type="text" value={databoy?.lga?.name ?? '—'} readOnly
                                className={`${inputCls} bg-gray-50 cursor-not-allowed text-gray-600 font-medium`} />
                        </div>

                        <div>
                            <label className={labelCls}>Ward</label>
                            <input type="text" value={databoy?.ward?.name ?? '—'} readOnly
                                className={`${inputCls} bg-gray-50 cursor-not-allowed text-gray-600 font-medium`} />
                        </div>

                        <div>
                            <label className={labelCls}>Polling Unit</label>
                            <select value={data.polling_unit_id}
                                onChange={(e) => setData('polling_unit_id', e.target.value)}
                                disabled={loadingPUs}
                                className={inputCls}>
                                <option value="">{loadingPUs ? 'Loading…' : 'Select Polling Unit…'}</option>
                                {pollingUnits.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {errors.polling_unit_id && <p className={errCls}>{errors.polling_unit_id}</p>}
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={data.has_voter_card}
                                onChange={(e) => setData('has_voter_card', e.target.checked)}
                                className="accent-indigo-600 w-4 h-4" />
                            <span className="text-sm text-gray-700">Applicant has a Voter's Card</span>
                        </label>
                    </Section>

                    {/* Bank & Network */}
                    <Section title="Bank &amp; Network Information">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Browsing Network *</label>
                                <select value={data.browsing_network}
                                    onChange={(e) => setData('browsing_network', e.target.value)} className={inputCls}>
                                    <option value="">Select your network</option>
                                    {NETWORKS.map((n) => <option key={n}>{n}</option>)}
                                </select>
                                {errors.browsing_network && <p className={errCls}>{errors.browsing_network}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Browsing Number *</label>
                                <input type="tel" value={data.browsing_number}
                                    onChange={(e) => setData('browsing_number', e.target.value)}
                                    placeholder="Your browsing network number" className={inputCls} />
                                {errors.browsing_number && <p className={errCls}>{errors.browsing_number}</p>}
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Select Your Bank *</label>
                            <select value={data.bank_name} onChange={(e) => handleBankChange(e.target.value)} className={inputCls}>
                                <option value="">{banks.length === 0 ? 'Loading banks…' : 'Select your bank'}</option>
                                {banks.map((b) => <option key={b.code} value={b.name}>{b.name}</option>)}
                            </select>
                            {errors.bank_name && <p className={errCls}>{errors.bank_name}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Account Number *</label>
                                <div className="relative">
                                    <input
                                        type="text" maxLength={10} value={data.account_number}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setData('account_number', val);
                                            if (val.length === 10 && data.bank_code) {
                                                triggerResolve(val, data.bank_code);
                                            } else if (val.length < 10) {
                                                clearAccount();
                                                setData('account_number', val);
                                            }
                                        }}
                                        placeholder="10-digit account number"
                                        className={inputCls + (resolving ? ' pr-9' : '')}
                                    />
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
                                <div className="relative">
                                    <input
                                        type="text" value={data.bank_account_name} readOnly
                                        placeholder={resolving ? 'Verifying…' : 'Auto-filled after verification'}
                                        className={inputCls + ' cursor-default ' + (resolvedName ? 'text-green-700 bg-green-50' : 'bg-gray-50 text-gray-400')}
                                    />
                                    {resolvedName && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </span>
                                    )}
                                </div>
                                {resolveError && <p className={errCls}>{resolveError}</p>}
                                {errors.bank_account_name && <p className={errCls}>{errors.bank_account_name}</p>}
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Employment Status *</label>
                            <select value={data.employment_status}
                                onChange={(e) => setData('employment_status', e.target.value)} className={inputCls}>
                                <option value="">Select your employment status</option>
                                {EMPLOYMENT.map((s) => <option key={s}>{s}</option>)}
                            </select>
                            {errors.employment_status && <p className={errCls}>{errors.employment_status}</p>}
                        </div>

                        {(data.employment_status === 'Employed' || data.employment_status === 'Self-employed') && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Current Occupation</label>
                                    <input type="text" value={data.current_occupation}
                                        onChange={(e) => setData('current_occupation', e.target.value)}
                                        placeholder="Your current occupation" className={inputCls} />
                                </div>
                                {data.employment_status === 'Employed' && (
                                    <div>
                                        <label className={labelCls}>Work Grade Level</label>
                                        <select value={data.work_grade_level}
                                            onChange={(e) => setData('work_grade_level', e.target.value)} className={inputCls}>
                                            <option value="">Select grade level</option>
                                            {GRADE_LEVELS.map((l) => <option key={l}>{l}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label className={labelCls}>Availability for Contract Work *</label>
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

                    {/* Documents */}
                    <Section title="Document Uploads">
                        {/* Passport — camera capture */}
                        <div>
                            <label className={labelCls}>White Background Passport Photograph *</label>
                            <div className="flex gap-2 mb-3">
                                <button type="button" onClick={startCamera}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Take Photo
                                </button>
                                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition cursor-pointer">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Upload File
                                    <input ref={passportRef} type="file" accept=".jpg,.jpeg,.png" className="hidden"
                                        onChange={(e) => handleFile('passport_photograph', e.target.files[0], null)} />
                                </label>
                            </div>

                            {/* Camera modal */}
                            {showCamera && createPortal(
                                <div className="fixed inset-0 bg-black/75 z-[9999] flex items-center justify-center p-4">
                                    <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden">
                                        <div className="px-4 py-3 border-b flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-800">Take Passport Photo</p>
                                                <p className="text-xs text-gray-500">Use a plain white background</p>
                                            </div>
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
                                                    onClick={() => { setCameraReady(false); setFacingMode(f => f === 'user' ? 'environment' : 'user'); }}
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

                            {/* Preview + background analysis */}
                            {capturedImage && (
                                <div className="flex flex-col items-center mb-3">
                                    <div className="relative inline-block mb-3">
                                        <img src={capturedImage} alt="Passport" className="w-32 h-32 object-cover rounded-xl border-2 border-green-400" />
                                        <button type="button" onClick={clearCapturedImage}
                                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-gray-400">JPEG, PNG (max 2MB) · White background required</p>
                            {errors.passport_photograph && <p className={errCls}>{errors.passport_photograph}</p>}
                        </div>

                        {/* ID Card & Certificate */}
                        {[
                            { label: 'Valid ID Card *', field: 'valid_id_card', ref: idCardRef, name: idCardName, setName: setIdCardName, accept: '.pdf,.jpg,.jpeg,.png', hint: "PDF, JPEG, PNG (max 5MB) · National ID, Driver's License, or Voter's Card" },
                            { label: 'Highest Qualification Certificate *', field: 'highest_qualification_certificate', ref: certRef, name: certName, setName: setCertName, accept: '.pdf,.jpg,.jpeg,.png', hint: 'PDF, JPEG, PNG (max 5MB) · Degree, Diploma, or Certificate' },
                        ].map(({ label, field, ref, name, setName, accept, hint }) => (
                            <div key={field}>
                                <label className={labelCls}>{label}</label>
                                <div className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-400 bg-white"
                                    onClick={() => ref.current.click()}>
                                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    <span className={`text-sm truncate ${name ? 'text-indigo-700 font-medium' : 'text-gray-500'}`}>
                                        {name || 'No file chosen'}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-400">{hint}</p>
                                <input ref={ref} type="file" accept={accept} className="hidden"
                                    onChange={(e) => handleFile(field, e.target.files[0], setName)} />
                                {errors[field] && <p className={errCls}>{errors[field]}</p>}
                            </div>
                        ))}
                    </Section>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-3.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold rounded-2xl shadow transition text-sm"
                    >
                        {processing ? 'Submitting…' : 'Submit Application'}
                    </button>
                </form>
            </div>
        </DataboyLayout>
    );
}
