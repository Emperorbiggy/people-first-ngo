import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Head, useForm } from '@inertiajs/react';
import { Transition } from '@headlessui/react';
import PaystackService from '../../services/paystack';

const states = ['Osun'];

const browsingNetworks = ['MTN','GLO','AIRTEL'];

const employmentStatuses = [
    'Employed','Unemployed','Student','Self-employed',
    'Corp member','Recently passed out Corp member',
];

const workGradeLevels = Array.from({ length: 17 }, (_, i) => `Level ${i + 1}`);

export default function Apply({ token, prefill, lgas = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        full_name:                          prefill.full_name         ?? '',
        email_address:                      '',
        calling_phone_number:               prefill.calling_phone_number ?? '',
        whatsapp_number:                    prefill.whatsapp_number   ?? '',
        state_of_residence:                 'Osun',
        house_address:                      '',
        browsing_network:                   '',
        browsing_number:                    '',
        bank_name:                          '',
        bank_code:                          '',
        account_number:                     '',
        bank_account_name:                  '',
        gender:                             '',
        age:                                '',
        employment_status:                  '',
        availability:                       'all_opportunities',
        current_occupation:                 '',
        work_grade_level:                   '',
        // New fields – pre-filled from imported data
        lga:                                prefill.lga               ?? '',
        ward:                               prefill.ward              ?? '',
        unit:                               prefill.unit              ?? '',
        has_voter_card:                     prefill.has_voter_card    ?? false,
        // Files
        passport_photograph:                null,
        valid_id_card:                      null,
        highest_qualification_certificate:  null,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('apply.submit', token));
    };

    // ── Camera / passport ─────────────────────────────────────────────────────
    const [showCamera, setShowCamera]           = useState(false);
    const [capturedImage, setCapturedImage]     = useState(null);
    const [idCardFileName, setIdCardName]       = useState('');
    const [certFileName, setCertName]           = useState('');
    const videoRef   = useRef(null);
    const streamRef  = useRef(null);
    const retryRef   = useRef(null);
    const [facingMode, setFacingMode]           = useState('user');
    const [cameraError, setCameraError]         = useState('');
    const [cameraReady, setCameraReady]         = useState(false);

    // ── Bank ─────────────────────────────────────────────────────────────────
    const [banks, setBanks]                         = useState([]);
    const [accountName, setAccountName]             = useState('');
    const [showAccountConfirm, setShowAccountConfirm] = useState(false);
    const [isResolvingAccount, setIsResolving]      = useState(false);
    const [accountError, setAccountError]           = useState('');

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
                setCameraError('Camera permission denied. Please allow camera access.');
            } else {
                setCameraError('Could not access camera. Close other apps using it and try again.');
            }
        }
    }, []);

    useEffect(() => {
        if (showCamera) acquireCamera(facingMode);
        return () => { if (!showCamera) releaseStream(); };
    }, [showCamera, facingMode]);

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
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const src = canvas.toDataURL('image/jpeg');
        const blob = await (await fetch(src)).blob();
        const file = new File([blob], 'passport.jpg', { type: 'image/jpeg' });
        setData('passport_photograph', file);
        setCapturedImage(src);
        stopCamera();
    }, []);

    const handleFileChange = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        setData(field, file);
        if (field === 'passport_photograph') { setCapturedImage(URL.createObjectURL(file)); }
        else if (field === 'valid_id_card') setIdCardName(file.name);
        else if (field === 'highest_qualification_certificate') setCertName(file.name);
    };

    useEffect(() => { PaystackService.fetchBanks().then(setBanks).catch(() => {}); }, []);

    const resolveAccount = async (num, code) => {
        if (!num || !code || num.length < 10) return;
        setIsResolving(true); setAccountError('');
        try {
            const result = await PaystackService.resolveAccountNumber(num, code);
            if (result.status && result.data) { setAccountName(result.data.account_name); setShowAccountConfirm(true); }
            else setAccountError(result.message || 'Unable to resolve account. Check the number.');
        } catch { setAccountError('Network error. Please try again.'); }
        finally { setIsResolving(false); }
    };

    const sectionClass  = "rounded-2xl p-6 sm:p-8 border-2 shadow-lg space-y-5";
    const inputClass    = "w-full px-4 py-3.5 text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all";
    const labelClass    = "block text-sm font-bold text-gray-700 mb-2";
    const errClass      = "text-xs text-red-600 mt-1.5 font-medium";

    return (
        <>
            <Head title="NGO Contract Application" />

            <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                <div className="relative z-10 flex items-center justify-center min-h-screen p-2 sm:p-4">
                    <div className="w-full max-w-5xl">
                        {/* Page header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-2xl mb-4">
                                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">NGO Contract Work Application</h1>
                            <p className="text-white/80 mt-2 text-sm">Fields highlighted in blue are pre-filled from your registration data.</p>
                        </div>

                        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-4 sm:p-8">
                            <form onSubmit={submit} className="space-y-8">

                                {/* ── Location Info (pre-filled, read-only) ─────────────── */}
                                <div className={`${sectionClass} bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200`}>
                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                        <span className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </span>
                                        Location Details
                                        <span className="text-xs font-normal text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Auto-filled</span>
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>State of Residence *</label>
                                            <select value={data.state_of_residence} onChange={(e) => setData('state_of_residence', e.target.value)} required className={inputClass}>
                                                <option value="">Select your state</option>
                                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            {errors.state_of_residence && <p className={errClass}>{errors.state_of_residence}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClass}>LGA</label>
                                            <select value={data.lga} onChange={(e) => setData('lga', e.target.value)} className={inputClass}>
                                                <option value="">— Select LGA —</option>
                                                {lgas.map((l) => (
                                                    <option key={l} value={l}>{l}</option>
                                                ))}
                                            </select>
                                            {errors.lga && <p className={errClass}>{errors.lga}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClass}>Ward</label>
                                            <input
                                                type="text"
                                                value={data.ward}
                                                onChange={(e) => setData('ward', e.target.value)}
                                                placeholder="Enter ward"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Unit</label>
                                            <input
                                                type="text"
                                                value={data.unit}
                                                onChange={(e) => setData('unit', e.target.value)}
                                                placeholder="Enter unit"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setData('has_voter_card', !data.has_voter_card)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${data.has_voter_card ? 'bg-blue-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${data.has_voter_card ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                        <label className="text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => setData('has_voter_card', !data.has_voter_card)}>
                                            I have a Voter's Card
                                        </label>
                                        {data.has_voter_card && (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Yes</span>
                                        )}
                                    </div>
                                </div>

                                {/* ── Personal Information ──────────────────────────────── */}
                                <div className={`${sectionClass} bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200`}>
                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                        <span className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </span>
                                        Personal Information
                                    </h3>

                                    <div>
                                        <label className={labelClass}>Full Name *</label>
                                        <input type="text" value={data.full_name} onChange={(e) => setData('full_name', e.target.value)} placeholder="As it appears on your ID" required className={inputClass} />
                                        {errors.full_name && <p className={errClass}>{errors.full_name}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Gender *</label>
                                            <select value={data.gender} onChange={(e) => setData('gender', e.target.value)} required className={inputClass}>
                                                <option value="">Select gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                            {errors.gender && <p className={errClass}>{errors.gender}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClass}>Age *</label>
                                            <input type="number" min="18" max="60" value={data.age} onChange={(e) => setData('age', e.target.value)} placeholder="18–60" required className={inputClass} />
                                            {errors.age && <p className={errClass}>{errors.age}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Working Email Address *</label>
                                        <input type="email" value={data.email_address} onChange={(e) => setData('email_address', e.target.value)} placeholder="your.email@example.com" required className={inputClass} />
                                        {errors.email_address && <p className={errClass}>{errors.email_address}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Calling Phone Number *</label>
                                            <input type="tel" value={data.calling_phone_number} onChange={(e) => setData('calling_phone_number', e.target.value)} placeholder="+234 800 000 0000" required className={inputClass} />
                                            {errors.calling_phone_number && <p className={errClass}>{errors.calling_phone_number}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClass}>WhatsApp Number *</label>
                                            <input type="tel" value={data.whatsapp_number} onChange={(e) => setData('whatsapp_number', e.target.value)} placeholder="+234 800 000 0000" required className={inputClass} />
                                            {errors.whatsapp_number && <p className={errClass}>{errors.whatsapp_number}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>House Address *</label>
                                        <textarea value={data.house_address} onChange={(e) => setData('house_address', e.target.value)} rows={3} placeholder="Street name, house number, nearest landmark" required className={inputClass} />
                                        {errors.house_address && <p className={errClass}>{errors.house_address}</p>}
                                    </div>
                                </div>

                                {/* ── Bank & Network ────────────────────────────────────── */}
                                <div className={`${sectionClass} bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200`}>
                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                        <span className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                        </span>
                                        Bank & Network Information
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Browsing Network *</label>
                                            <select value={data.browsing_network} onChange={(e) => setData('browsing_network', e.target.value)} required className={inputClass}>
                                                <option value="">Select network</option>
                                                {browsingNetworks.map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                            {errors.browsing_network && <p className={errClass}>{errors.browsing_network}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClass}>Browsing Number *</label>
                                            <input type="text" value={data.browsing_number} onChange={(e) => setData('browsing_number', e.target.value)} placeholder="Network number" required className={inputClass} />
                                            {errors.browsing_number && <p className={errClass}>{errors.browsing_number}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Select Your Bank *</label>
                                        <select
                                            value={data.bank_code}
                                            onChange={(e) => {
                                                const b = banks.find(x => x.code === e.target.value);
                                                setData('bank_code', b?.code ?? e.target.value);
                                                setData('bank_name', b?.name ?? e.target.value);
                                                setData('bank_account_name', '');
                                                setAccountName('');
                                            }}
                                            required className={inputClass}
                                        >
                                            <option value="">Select your bank</option>
                                            {banks.map((b, i) => <option key={`${b.code}-${i}`} value={b.code}>{b.name}</option>)}
                                        </select>
                                        {errors.bank_name && <p className={errClass}>{errors.bank_name}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Account Number *</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={data.account_number}
                                                    maxLength={10}
                                                    onChange={(e) => {
                                                        setData('account_number', e.target.value);
                                                        setAccountName('');
                                                        setData('bank_account_name', '');
                                                        setAccountError('');
                                                        if (e.target.value.length === 10 && data.bank_code) resolveAccount(e.target.value, data.bank_code);
                                                    }}
                                                    placeholder="10-digit account number"
                                                    required
                                                    className={`${inputClass} pr-10`}
                                                />
                                                {isResolvingAccount && (
                                                    <div className="absolute inset-y-0 right-3 flex items-center">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                                                    </div>
                                                )}
                                            </div>
                                            {errors.account_number && <p className={errClass}>{errors.account_number}</p>}
                                            {accountError && <p className={errClass}>{accountError}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClass}>Bank Account Name *</label>
                                            <input type="text" value={data.bank_account_name} readOnly placeholder="Auto-verified from bank" required className={`${inputClass} bg-gray-50`} />
                                            {errors.bank_account_name && <p className={errClass}>{errors.bank_account_name}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Employment Status *</label>
                                        <select
                                            value={data.employment_status}
                                            onChange={(e) => {
                                                setData('employment_status', e.target.value);
                                                if (e.target.value !== 'Employed' && e.target.value !== 'Self-employed') { setData('current_occupation', ''); setData('work_grade_level', ''); }
                                                if (e.target.value === 'Self-employed') setData('work_grade_level', '');
                                            }}
                                            required className={inputClass}
                                        >
                                            <option value="">Select employment status</option>
                                            {employmentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        {errors.employment_status && <p className={errClass}>{errors.employment_status}</p>}
                                    </div>

                                    {(data.employment_status === 'Employed' || data.employment_status === 'Self-employed') && (
                                        <div>
                                            <label className={labelClass}>Current Occupation *</label>
                                            <input type="text" value={data.current_occupation} onChange={(e) => setData('current_occupation', e.target.value)} placeholder="e.g. Teacher, Engineer, Business Owner" required className={inputClass} />
                                            {errors.current_occupation && <p className={errClass}>{errors.current_occupation}</p>}
                                        </div>
                                    )}

                                    {data.employment_status === 'Employed' && (
                                        <div>
                                            <label className={labelClass}>Work Grade Level *</label>
                                            <select value={data.work_grade_level} onChange={(e) => setData('work_grade_level', e.target.value)} required className={inputClass}>
                                                <option value="">Select grade level</option>
                                                {workGradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                            {errors.work_grade_level && <p className={errClass}>{errors.work_grade_level}</p>}
                                        </div>
                                    )}

                                    {/* Availability */}
                                    <div>
                                        <label className={labelClass}>Availability for Contract Work *</label>
                                        <p className="text-xs text-gray-500 mb-3">Select one option that applies to you</p>
                                        <div className="space-y-2">
                                            {[
                                                { value: 'all_opportunities', label: 'I am available for all opportunities' },
                                                { value: 'southwest_travel', label: 'I am available for short-time contract work within South West' },
                                                { value: 'outside_state', label: 'I am available for a 30-day contract work outside my state of residence' },
                                                { value: 'not_available', label: 'I am not available' },
                                            ].map(opt => (
                                                <label key={opt.value} className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${data.availability === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${data.availability === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                                                        {data.availability === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                                                    </div>
                                                    <input type="radio" name="availability" value={opt.value} checked={data.availability === opt.value} onChange={() => setData('availability', opt.value)} className="sr-only" />
                                                    <span className="text-sm text-gray-700 font-medium">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {errors.availability && <p className={errClass}>{errors.availability}</p>}
                                    </div>
                                </div>

                                {/* ── Document Uploads ──────────────────────────────────── */}
                                <div className={`${sectionClass} bg-gradient-to-r from-green-50 to-emerald-50 border-green-200`}>
                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                        <span className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </span>
                                        Document Uploads
                                    </h3>

                                    {/* Passport */}
                                    <div>
                                        <label className={labelClass}>White Background Passport Photograph *</label>
                                        <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                            <button type="button" onClick={() => { setShowCamera(true); document.body.style.overflow = 'hidden'; }} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                Take Photo
                                            </button>
                                            <label className="flex-1 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors cursor-pointer flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                Upload File
                                                <input type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" onChange={(e) => handleFileChange(e, 'passport_photograph')} />
                                            </label>
                                        </div>

                                        {capturedImage && (
                                            <div className="flex flex-col items-center gap-3 mb-3">
                                                <div className="relative">
                                                    <img src={capturedImage} alt="Passport" className="w-32 h-32 object-cover rounded-xl border-2 border-green-500 shadow" />
                                                    <button type="button" onClick={() => { setCapturedImage(null); setData('passport_photograph', null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {errors.passport_photograph && <p className={errClass}>{errors.passport_photograph}</p>}
                                    </div>

                                    {/* Camera Modal */}
                                    {showCamera && createPortal(
                                        <div className="fixed inset-0 bg-black/75 z-[9999] flex items-center justify-center p-4">
                                            <div className="bg-white rounded-2xl max-w-lg w-full">
                                                <div className="p-4 border-b flex items-center justify-between">
                                                    <div><h3 className="text-base font-semibold">Take Passport Photo</h3><p className="text-xs text-gray-500">Use a plain white background</p></div>
                                                    <button type="button" onClick={stopCamera} className="text-gray-500 hover:text-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                </div>
                                                <div className="p-4">
                                                    {cameraError ? (
                                                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                                                            <p className="text-sm text-red-600 mb-2">{cameraError}</p>
                                                            <button type="button" onClick={() => acquireCamera(facingMode)} className="text-sm text-blue-600 underline">Try again</button>
                                                        </div>
                                                    ) : (
                                                        <div className="relative bg-black rounded-xl overflow-hidden" style={{ minHeight: 240 }}>
                                                            {!cameraReady && <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10"><p className="text-white text-sm">Starting camera...</p></div>}
                                                            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                                                        </div>
                                                    )}
                                                    <div className="flex justify-center gap-3 mt-4 flex-wrap">
                                                        <button type="button" onClick={() => { setCameraReady(false); setFacingMode(f => f === 'user' ? 'environment' : 'user'); }} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-300">Flip Camera</button>
                                                        <button type="button" onClick={capturePhoto} disabled={!cameraReady} className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">Capture</button>
                                                        <button type="button" onClick={stopCamera} className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-xl hover:bg-gray-700">Cancel</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>, document.body
                                    )}

                                    {/* ID Card */}
                                    <div>
                                        <label className={labelClass}>Valid ID Card * <span className="text-xs font-normal text-gray-500">(PDF/JPG/PNG, max 5MB)</span></label>
                                        <input type="file" accept="image/jpeg,image/png,image/jpg,application/pdf" onChange={(e) => handleFileChange(e, 'valid_id_card')} required className="w-full text-sm border-2 border-gray-300 rounded-xl p-3 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 transition-all" />
                                        {idCardFileName && <p className="mt-1.5 text-xs text-green-700 font-medium">✓ {idCardFileName}</p>}
                                        {errors.valid_id_card && <p className={errClass}>{errors.valid_id_card}</p>}
                                    </div>

                                    {/* Certificate */}
                                    <div>
                                        <label className={labelClass}>Highest Qualification Certificate * <span className="text-xs font-normal text-gray-500">(PDF/JPG/PNG, max 5MB)</span></label>
                                        <input type="file" accept="image/jpeg,image/png,image/jpg,application/pdf" onChange={(e) => handleFileChange(e, 'highest_qualification_certificate')} required className="w-full text-sm border-2 border-gray-300 rounded-xl p-3 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 transition-all" />
                                        {certFileName && <p className="mt-1.5 text-xs text-green-700 font-medium">✓ {certFileName}</p>}
                                        {errors.highest_qualification_certificate && <p className={errClass}>{errors.highest_qualification_certificate}</p>}
                                    </div>
                                </div>

                                {/* Submit */}
                                <div className="flex flex-col items-center gap-4 pt-2">
                                    <button type="submit" disabled={processing} className="px-12 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-base rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                                        {processing ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                Submitting...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                Submit Application
                                            </span>
                                        )}
                                    </button>
                                    <p className="text-xs text-gray-400 text-center">Your application is tied to your verified identity. Do not share your link.</p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Confirmation Modal */}
            {showAccountConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">Confirm Account Details</h3>
                        <p className="text-xs text-gray-500 mb-4">Is this the correct account name?</p>
                        <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
                            <div><span className="text-xs text-gray-500">Account Number</span><p className="font-semibold">{data.account_number}</p></div>
                            <div><span className="text-xs text-gray-500">Account Name</span><p className="font-semibold text-green-700">{accountName}</p></div>
                            <div><span className="text-xs text-gray-500">Bank</span><p className="font-semibold">{data.bank_name}</p></div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => { setAccountName(''); setShowAccountConfirm(false); setData('account_number', ''); setData('bank_account_name', ''); }} className="flex-1 py-2.5 bg-gray-200 text-gray-800 text-sm font-semibold rounded-xl hover:bg-gray-300 transition-colors">No, Wrong</button>
                            <button type="button" onClick={() => { setData('bank_account_name', accountName); setShowAccountConfirm(false); }} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">Yes, Correct</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse { 0%,100%{opacity:.6;transform:scale(1)}50%{opacity:.8;transform:scale(1.05)} }
                .animate-pulse { animation: pulse 4s ease-in-out infinite; }
            `}</style>
        </>
    );
}
