import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Head, Link, useForm } from '@inertiajs/react';
import { Transition } from '@headlessui/react';
import PaystackService from '../../services/paystack';

const states = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
    'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
    'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
    'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

const browsingNetworks = [
    'MTN',
    'GLO',
    'AIRTEL'
];

const employmentStatuses = [
    'Employed',
    'Unemployed',
    'Student',
    'Self-employed',
    'Corp member',
    'Recently passed out Corp member',
];

const workGradeLevels = [
    'Level 1',
    'Level 2',
    'Level 3',
    'Level 4',
    'Level 5',
    'Level 6',
    'Level 7',
    'Level 8',
    'Level 9',
    'Level 10',
    'Level 11',
    'Level 12',
    'Level 13',
    'Level 14',
    'Level 15',
    'Level 16',
    'Level 17'
];


export default function Create() {
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        full_name: '',
        email_address: '',
        calling_phone_number: '',
        whatsapp_number: '',
        state_of_residence: '',
        house_address: '',
        browsing_network: '',
        browsing_number: '',
        bank_name: '',
        bank_code: '',
        account_number: '',
        bank_account_name: '',
        gender: '',
        age: '',
        employment_status: '',
        availability: 'all_opportunities',
        current_occupation: '',
        work_grade_level: '',
        passport_photograph: null,
        valid_id_card: null,
        highest_qualification_certificate: null,
    });

    const submit = (e) => {
        e.preventDefault();
        console.log('Form data being submitted:', data);
        post(route('ngo-contract-applications.store'));
    };

    const handleFileChange = async (e, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;
        setData(fieldName, file);

        if (fieldName === 'passport_photograph') {
            setCapturedImage(URL.createObjectURL(file));
        } else if (fieldName === 'valid_id_card') {
            setIdCardFileName(file.name);
        } else if (fieldName === 'highest_qualification_certificate') {
            setCertificateFileName(file.name);
        }
    };

    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [idCardFileName, setIdCardFileName] = useState('');
    const [certificateFileName, setCertificateFileName] = useState('');
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const retryRef = useRef(null);
    const [facingMode, setFacingMode] = useState('user');
    const [cameraError, setCameraError] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const [banks, setBanks] = useState([]);
    const [accountName, setAccountName] = useState('');
    const [showAccountConfirmation, setShowAccountConfirmation] = useState(false);
    const [isResolvingAccount, setIsResolvingAccount] = useState(false);
    const [accountResolutionError, setAccountResolutionError] = useState('');

    const releaseStream = () => {
        if (retryRef.current) clearTimeout(retryRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    const acquireCamera = useCallback(async (facing, attempt = 0) => {
        releaseStream();
        setCameraError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
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

    const startCamera = () => {
        setCameraError('');
        setCameraReady(false);
        setShowCamera(true);
        document.body.style.overflow = 'hidden';
    };

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
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const imageSrc = canvas.toDataURL('image/jpeg');

        const res = await fetch(imageSrc);
        const blob = await res.blob();
        const file = new File([blob], 'passport.jpg', { type: 'image/jpeg' });
        setData('passport_photograph', file);
        setCapturedImage(imageSrc);
        stopCamera();
    }, []);

    const clearCapturedImage = () => {
        setCapturedImage(null);
        setData('passport_photograph', null);
    };

    // Paystack API functions using service layer
    const fetchBanks = async () => {
        try {
            const banksData = await PaystackService.fetchBanks();
            setBanks(banksData);
        } catch (error) {
            console.error('Error fetching banks:', error);
        }
    };

    const resolveAccount = async (accountNumber, bankCode) => {
        if (!accountNumber || !bankCode || accountNumber.length < 10) {
            return;
        }

        setIsResolvingAccount(true);
        setAccountResolutionError('');
        
        try {
            const result = await PaystackService.resolveAccountNumber(accountNumber, bankCode);
            
            if (result.status && result.data) {
                setAccountName(result.data.account_name);
                setShowAccountConfirmation(true);
            } else {
                setAccountResolutionError(result.message || 'Unable to resolve account. Please check the account number.');
            }
        } catch (error) {
            console.error('Error resolving account:', error);
            setAccountResolutionError('Network error. Please try again.');
        } finally {
            setIsResolvingAccount(false);
        }
    };

    const confirmAccountName = () => {
        setData('bank_account_name', accountName);
        setShowAccountConfirmation(false);
    };

    const rejectAccountName = () => {
        setAccountName('');
        setShowAccountConfirmation(false);
        setData('account_number', '');
        setData('bank_account_name', '');
    };

    // Fetch banks on component mount
    useEffect(() => {
        fetchBanks();
    }, []);

    return (
        <>
            <Head title="NGO Contract Application" />
            
            <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                    <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                </div>

                <div className="relative z-10 flex items-center justify-center min-h-screen p-2 sm:p-4">
                    <div className="w-full max-w-5xl">
                        {/* Header Section */}
                        <div className="text-center mb-6 sm:mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-2xl mb-3 sm:mb-4">
                                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-4 drop-shadow-lg px-4">
                                NGO Contract Work Application
                            </h1>
                            <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow px-4">
                                Join our mission to make a difference. Complete the form below to apply for contract opportunities.
                            </p>
                        </div>

                        {/* Form Container */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 lg:p-10">
                            <form onSubmit={submit} className="space-y-8">
                                {/* Clear Instructions */}
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 text-white">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="text-center sm:text-left">
                                            <h2 className="text-xl sm:text-2xl font-bold mb-2">Complete Your Application</h2>
                                            <p className="text-white/90 text-sm sm:text-base">Please fill in all required fields below. All information is needed to process your application.</p>
                                        </div>
                                        <div className="hidden sm:block">
                                            <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Information Section */}
                                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border-2 border-purple-200 shadow-lg">
                                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 lg:mb-8 flex items-center">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                                            <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                            </svg>
                                        </div>
                                        <span className="text-sm sm:text-base lg:text-lg">Personal Information</span>
                                    </h3>
                                    
                                    <div className="space-y-4 sm:space-y-6">
                                        <div>
                                            <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Full Name *</label>
                                            <input
                                                type="text"
                                                name="full_name"
                                                value={data.full_name}
                                                className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
                                                placeholder="Enter your full name as it appears on your ID"
                                                onChange={(e) => setData('full_name', e.target.value)}
                                                required
                                            />
                                            {errors.full_name && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.full_name}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                            <div>
                                                <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Gender *</label>
                                                <select
                                                    name="gender"
                                                    value={data.gender}
                                                    className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
                                                    onChange={(e) => setData('gender', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                                {errors.gender && <p className="text-sm text-red-600 mt-2 font-medium">{errors.gender}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Age *</label>
                                                <input
                                                    type="number"
                                                    name="age"
                                                    value={data.age}
                                                    min="18"
                                                    max="60"
                                                    className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
                                                    placeholder="Enter your age (18–60)"
                                                    onChange={(e) => setData('age', e.target.value)}
                                                    required
                                                />
                                                {errors.age && <p className="text-sm text-red-600 mt-2 font-medium">{errors.age}</p>}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Working Email Address *</label>
                                            <input
                                                type="email"
                                                name="email_address"
                                                value={data.email_address}
                                                className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
                                                placeholder="your.email@example.com"
                                                onChange={(e) => setData('email_address', e.target.value)}
                                                required
                                            />
                                            {errors.email_address && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.email_address}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                            <div>
                                                <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Calling Phone Number *</label>
                                                <input
                                                    type="tel"
                                                    name="calling_phone_number"
                                                    value={data.calling_phone_number}
                                                    className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
                                                    placeholder="+234 800 000 0000"
                                                    onChange={(e) => setData('calling_phone_number', e.target.value)}
                                                    required
                                                />
                                                {errors.calling_phone_number && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.calling_phone_number}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">WhatsApp Number *</label>
                                                <input
                                                    type="tel"
                                                    name="whatsapp_number"
                                                    value={data.whatsapp_number}
                                                    className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
                                                    placeholder="+234 800 000 0000"
                                                    onChange={(e) => setData('whatsapp_number', e.target.value)}
                                                    required
                                                />
                                                {errors.whatsapp_number && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.whatsapp_number}</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                            <div>
                                                <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">State of Residence *</label>
                                                <select
                                                    name="state_of_residence"
                                                    value={data.state_of_residence}
                                                    className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
                                                    onChange={(e) => setData('state_of_residence', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select your state</option>
                                                    {states.map(state => (
                                                        <option key={state} value={state}>{state}</option>
                                                    ))}
                                                </select>
                                                {errors.state_of_residence && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.state_of_residence}</p>}
                                            </div>

                                            </div>

                                        <div>
                                            <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">House Address *</label>
                                            <textarea
                                                name="house_address"
                                                value={data.house_address}
                                                className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
                                                rows={3}
                                                placeholder="Enter your complete residential address including street name, house number, and landmark"
                                                onChange={(e) => setData('house_address', e.target.value)}
                                                required
                                            />
                                            {errors.house_address && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.house_address}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Bank & Network Information Section */}
                                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 border-2 border-blue-200 shadow-lg">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
                                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                                            </svg>
                                        </div>
                                        Bank & Network Information
                                    </h3>
                                    
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                            <div>
                                                <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Browsing Network *</label>
                                                <select
                                                    name="browsing_network"
                                                    value={data.browsing_network}
                                                    className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                                                    onChange={(e) => setData('browsing_network', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select your network</option>
                                                    {browsingNetworks.map(network => (
                                                        <option key={network} value={network}>{network}</option>
                                                    ))}
                                                </select>
                                                {errors.browsing_network && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.browsing_network}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Browsing Number *</label>
                                                <input
                                                    type="text"
                                                    name="browsing_number"
                                                    value={data.browsing_number}
                                                    className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                                                    placeholder="Your browsing network number"
                                                    onChange={(e) => setData('browsing_number', e.target.value)}
                                                    required
                                                />
                                                {errors.browsing_number && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.browsing_number}</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                            <div>
                                                <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Select Your Bank *</label>
                                                <select
                                                    name="bank_name"
                                                    value={data.bank_code}
                                                    className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                                                    onChange={(e) => {
                                                        const selected = banks.find(b => b.code === e.target.value);
                                                        setData('bank_code', selected?.code ?? e.target.value);
                                                        setData('bank_name', selected?.name ?? e.target.value);
                                                        setData('bank_account_name', '');
                                                        setAccountName('');
                                                    }}
                                                    required
                                                >
                                                    <option value="">Select your bank</option>
                                                    {banks.map((bank, index) => (
                                                        <option key={`${bank.code || bank}-${index}`} value={bank.code || bank}>{bank.name || bank}</option>
                                                    ))}
                                                </select>
                                                {errors.bank_name && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.bank_name}</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                            <div>
                                                <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Account Number *</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        name="account_number"
                                                        value={data.account_number}
                                                        className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 pr-12"
                                                        placeholder="Your 10-digit bank account number"
                                                        onChange={(e) => {
                                                            setData('account_number', e.target.value);
                                                            setAccountName('');
                                                            setData('bank_account_name', '');
                                                            setAccountResolutionError('');
                                                            
                                                            // Auto-resolve account when 10 digits are entered
                                                            if (e.target.value.length === 10 && data.bank_code) {
                                                                resolveAccount(e.target.value, data.bank_code);
                                                            }
                                                        }}
                                                        maxLength={10}
                                                        required
                                                    />
                                                    {isResolvingAccount && (
                                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                {errors.account_number && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.account_number}</p>}
                                                {accountResolutionError && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{accountResolutionError}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Bank Account Name *</label>
                                                <input
                                                    type="text"
                                                    name="bank_account_name"
                                                    value={data.bank_account_name}
                                                    className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 bg-gray-50"
                                                    placeholder="Account name will be auto-verified"
                                                    readOnly
                                                    required
                                                />
                                                {accountName && !data.bank_account_name && (
                                                    <p className="text-xs sm:text-sm text-blue-600 mt-2 font-medium">Account resolved! Please confirm in the popup.</p>
                                                )}
                                                {errors.bank_account_name && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.bank_account_name}</p>}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Employment Status *</label>
                                            <select
                                                name="employment_status"
                                                value={data.employment_status || ''}
                                                className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                                                onChange={(e) => {
                                                    setData('employment_status', e.target.value);
                                                    // Clear occupation and work level if not employed or self-employed
                                                    if (e.target.value !== 'Employed' && e.target.value !== 'Self-employed') {
                                                        setData('current_occupation', '');
                                                        setData('work_grade_level', '');
                                                    }
                                                    // Clear work level if self-employed (they only need occupation)
                                                    if (e.target.value === 'Self-employed') {
                                                        setData('work_grade_level', '');
                                                    }
                                                }}
                                                required
                                            >
                                                <option value="">Select your employment status</option>
                                                {employmentStatuses.map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                            {errors.employment_status && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.employment_status}</p>}
                                        </div>

                                        {/* Availability */}
                                        <div>
                                            <label className="block text-sm sm:text-base font-bold text-gray-700 mb-3">Availability for Contract Work *</label>
                                            <p className="text-sm text-gray-500 mb-3">Select one option that applies to you</p>
                                            <div className="space-y-3">
                                                {[
                                                    {
                                                        value: 'all_opportunities',
                                                        label: 'I am Available for all opportunities',
                                                    },
                                                    {
                                                        value: 'southwest_travel',
                                                        label: 'I am available for a short-time contract work that will require me to travel within South West',
                                                    },
                                                    {
                                                        value: 'outside_state',
                                                        label: 'I am available for a 30-day contract work in a state outside my state of residence',
                                                    },
                                                    {
                                                        value: 'not_available',
                                                        label: 'I am not available',
                                                    },
                                                ].map(option => (
                                                    <label
                                                        key={option.value}
                                                        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                                            data.availability === option.value
                                                                ? 'border-blue-500 bg-blue-50'
                                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                                            data.availability === option.value
                                                                ? 'border-blue-500 bg-blue-500'
                                                                : 'border-gray-300'
                                                        }`}>
                                                            {data.availability === option.value && (
                                                                <div className="w-2 h-2 rounded-full bg-white" />
                                                            )}
                                                        </div>
                                                        <input
                                                            type="radio"
                                                            name="availability"
                                                            value={option.value}
                                                            checked={data.availability === option.value}
                                                            onChange={() => setData('availability', option.value)}
                                                            className="sr-only"
                                                        />
                                                        <span className="text-sm sm:text-base text-gray-700 font-medium">{option.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {errors.availability && <p className="text-sm text-red-600 mt-2 font-medium">{errors.availability}</p>}
                                        </div>

                                        {(data.employment_status === 'Employed' || data.employment_status === 'Self-employed') && (
                                            <div className="mt-6">
                                                <div>
                                                    <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Current Occupation *</label>
                                                    <input
                                                        type="text"
                                                        name="current_occupation"
                                                        value={data.current_occupation || ''}
                                                        className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                                                        placeholder="e.g., Senior Manager, Teacher, Engineer, Business Owner"
                                                        onChange={(e) => setData('current_occupation', e.target.value)}
                                                        required
                                                    />
                                                    {errors.current_occupation && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.current_occupation}</p>}
                                                </div>
                                            </div>
                                        )}

                                        {data.employment_status === 'Employed' && (
                                            <div className="mt-6">
                                                <div>
                                                    <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">Work Level *</label>
                                                    <select
                                                        name="work_grade_level"
                                                        value={data.work_grade_level || ''}
                                                        className="w-full px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-3 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                                                        onChange={(e) => setData('work_grade_level', e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Select your work level</option>
                                                        {workGradeLevels.map(grade => (
                                                            <option key={grade} value={grade}>{grade}</option>
                                                        ))}
                                                    </select>
                                                    {errors.work_grade_level && <p className="text-sm sm:text-base text-red-600 mt-2 font-medium">{errors.work_grade_level}</p>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Document Uploads Section */}
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200 shadow-lg">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
                                        <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center mr-4">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                            </svg>
                                        </div>
                                        Document Uploads
                                    </h3>
                                    
                                    
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3">White Background Passport Photograph *</label>
                                            
                                            {/* Camera Capture Section */}
                                            <div className="mb-4">
                                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={startCamera}
                                                        className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                                                    >
                                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                        </svg>
                                                        <span className="text-sm sm:text-base">Take Photo</span>
                                                    </button>
                                                    
                                                    <label className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors cursor-pointer flex items-center justify-center">
                                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                                        </svg>
                                                        <span className="text-sm sm:text-base">Upload File</span>
                                                        <input
                                                            type="file"
                                                            name="passport_photograph"
                                                            accept="image/jpeg,image/png,image/jpg"
                                                            className="hidden"
                                                            onChange={(e) => handleFileChange(e, 'passport_photograph')}
                                                        />
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Camera Modal */}
                                            {showCamera && createPortal(
                                                <div className="fixed inset-0 bg-black bg-opacity-75 z-[9999] flex items-center justify-center p-4">
                                                    <div className="bg-white rounded-xl max-w-lg w-full">
                                                        <div className="p-4 border-b flex items-center justify-between">
                                                            <div>
                                                                <h3 className="text-lg font-semibold">Take Passport Photo</h3>
                                                                <p className="text-sm text-gray-500">Use a plain white background</p>
                                                            </div>
                                                            <button type="button" onClick={stopCamera} className="text-gray-500 hover:text-gray-700">
                                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                        <div className="p-4">
                                                            {cameraError ? (
                                                                <div className="w-full rounded-lg bg-red-50 border border-red-200 p-6 text-center">
                                                                    <p className="text-red-600 font-medium text-sm mb-2">{cameraError}</p>
                                                                    <button type="button" onClick={() => acquireCamera(facingMode)} className="text-sm text-blue-600 underline">Try again</button>
                                                                </div>
                                                            ) : (
                                                                <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: 240 }}>
                                                                    {!cameraReady && (
                                                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                                                                            <p className="text-white text-sm">Starting camera...</p>
                                                                        </div>
                                                                    )}
                                                                    <video
                                                                        ref={videoRef}
                                                                        autoPlay
                                                                        playsInline
                                                                        muted
                                                                        className="w-full rounded-lg"
                                                                        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="flex justify-center gap-3 mt-4 flex-wrap">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setCameraReady(false); setFacingMode(f => f === 'user' ? 'environment' : 'user'); }}
                                                                    className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors text-sm"
                                                                >
                                                                    Flip Camera
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={capturePhoto}
                                                                    disabled={!cameraReady}
                                                                    className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    Capture
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={stopCamera}
                                                                    className="px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            , document.body)}

                                            {/* Captured/Uploaded Image Preview with Background Analysis */}
                                            {capturedImage && (
                                                <div className="mb-4">
                                                    <div className="flex flex-col items-center">
                                                        <div className="relative inline-block mb-3">
                                                            <img
                                                                src={capturedImage}
                                                                alt="Passport photo"
                                                                className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-lg border-2 border-green-500"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={clearCapturedImage}
                                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {errors.passport_photograph && <p className="text-xs sm:text-sm text-red-600 mt-2 font-medium">{errors.passport_photograph}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-base font-bold text-gray-700 mb-3">Valid ID Card *</label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    name="valid_id_card"
                                                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                                                    className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-3 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-base file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                                    onChange={(e) => handleFileChange(e, 'valid_id_card')}
                                                    required
                                                />
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                                                    </svg>
                                                </div>
                                            </div>
                                            <p className="text-base text-gray-600 mt-3 font-medium">PDF, JPEG, PNG, JPG (Maximum: 5MB) - National ID, Driver's License, or Voter's Card</p>
                                            {idCardFileName && (
                                                <div className="mt-3 flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                                                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-sm text-green-800 font-medium truncate">{idCardFileName}</span>
                                                </div>
                                            )}
                                            {errors.valid_id_card && <p className="text-base text-red-600 mt-3 font-medium">{errors.valid_id_card}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-base font-bold text-gray-700 mb-3">Highest Qualification Certificate *</label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    name="highest_qualification_certificate"
                                                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                                                    className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-3 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-base file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                                    onChange={(e) => handleFileChange(e, 'highest_qualification_certificate')}
                                                    required
                                                />
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                    </svg>
                                                </div>
                                            </div>
                                            <p className="text-base text-gray-600 mt-3 font-medium">PDF, JPEG, PNG, JPG (Maximum: 5MB) - Degree, Diploma, or Certificate</p>
                                            {certificateFileName && (
                                                <div className="mt-3 flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                                                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-sm text-green-800 font-medium truncate">{certificateFileName}</span>
                                                </div>
                                            )}
                                            {errors.highest_qualification_certificate && <p className="text-base text-red-600 mt-3 font-medium">{errors.highest_qualification_certificate}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Section */}
                                <div className="flex flex-col items-center space-y-4 pt-6">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-12 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {processing ? (
                                            <span className="flex items-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Submitting...
                                            </span>
                                        ) : (
                                            <span className="flex items-center">
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                                </svg>
                                                Submit Application
                                            </span>
                                        )}
                                    </button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-out duration-300"
                                        enterFrom="opacity-0 transform scale-90"
                                        enterTo="opacity-100 transform scale-100"
                                        leave="transition ease-in duration-200"
                                        leaveFrom="opacity-100 transform scale-100"
                                        leaveTo="opacity-0 transform scale-90"
                                    >
                                        <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-xl flex items-center">
                                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span className="font-medium">Application submitted successfully!</span>
                                        </div>
                                    </Transition>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Confirmation Popup */}
            {showAccountConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Account Details</h3>
                            <p className="text-sm text-gray-600">Please verify that the account name is correct</p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="space-y-2">
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Account Number</p>
                                    <p className="text-sm font-semibold text-gray-900">{data.account_number}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Account Name</p>
                                    <p className="text-sm font-semibold text-gray-900">{accountName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Bank</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {data.bank_name}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={rejectAccountName}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                No, It's Wrong
                            </button>
                            <button
                                type="button"
                                onClick={confirmAccountName}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Yes, It's Correct
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add custom styles for animations */}
            <style>{`
                @keyframes blob {
                    0% {
                        transform: translate(0px, 0px) scale(1);
                    }
                    33% {
                        transform: translate(30px, -50px) scale(1.1);
                    }
                    66% {
                        transform: translate(-20px, 20px) scale(0.9);
                    }
                    100% {
                        transform: translate(0px, 0px) scale(1);
                    }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </>
    );
}
