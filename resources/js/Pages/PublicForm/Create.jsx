import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';
const errCls   = 'mt-1 text-xs text-red-600';

export default function Create({ lgas = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        full_name: '',
        phone_number: '',
        lga_id: '',
        ward_id: '',
        passport_photograph: null,
    });

    const [wards, setWards]         = useState([]);
    const [loadingWards, setLoadingWards] = useState(false);

    // Camera / passport capture state
    const [showCamera, setShowCamera]   = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [backgroundWarning, setBackgroundWarning] = useState('');
    const [cameraError, setCameraError] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const [facingMode, setFacingMode]   = useState('user');
    const videoRef  = useRef(null);
    const streamRef = useRef(null);
    const retryRef  = useRef(null);
    const passportRef = useRef();

    useEffect(() => {
        if (!data.lga_id) { setWards([]); return; }
        setLoadingWards(true);
        setData('ward_id', '');
        axios.get(route('new-form.api.wards', { lga: data.lga_id }))
            .then(({ data: res }) => setWards(res))
            .catch(() => setWards([]))
            .finally(() => setLoadingWards(false));
    }, [data.lga_id]);

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

    const detectBackground = (imageSource, isFile = false) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = Math.min(1, 200 / Math.max(img.width, img.height));
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const { data: px } = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let whiteCount = 0, total = 0;
                for (let i = 0; i < px.length; i += 4) {
                    const r = px[i], g = px[i+1], b = px[i+2];
                    if (r > 200 && g > 200 && b > 200) whiteCount++;
                    total++;
                }
                const ratio = whiteCount / total;
                if (ratio > 0.45) resolve({ message: '✅ White background detected' });
                else if (ratio > 0.25) resolve({ message: '⚠️ Background may not be fully white' });
                else resolve({ message: '❌ Non-white background detected' });
            };
            img.onerror = () => resolve({ message: '⚠️ Could not analyse background' });
            img.src = isFile ? URL.createObjectURL(imageSource) : imageSource;
        });
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
        const analysis = await detectBackground(file, true);
        setBackgroundWarning(analysis.message);
    }, []);

    const clearCapturedImage = () => {
        setCapturedImage(null);
        setBackgroundWarning('');
        setData('passport_photograph', null);
    };

    const handleFile = async (file) => {
        if (!file) return;
        setData('passport_photograph', file);
        setCapturedImage(URL.createObjectURL(file));
        const analysis = await detectBackground(file, true);
        setBackgroundWarning(analysis.message);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('new-form.store'), { forceFormData: true });
    };

    return (
        <>
            <Head title="Registration Form" />
            <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-10 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold text-gray-800">Registration Form</h1>
                        <p className="text-sm text-gray-500 mt-1">Only one person can register per ward.</p>
                    </div>

                    <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

                        <div>
                            <label className={labelCls}>Name *</label>
                            <input type="text" value={data.full_name}
                                onChange={(e) => setData('full_name', e.target.value)}
                                placeholder="Enter full name" className={inputCls} />
                            {errors.full_name && <p className={errCls}>{errors.full_name}</p>}
                        </div>

                        <div>
                            <label className={labelCls}>Phone Number *</label>
                            <input type="tel" value={data.phone_number}
                                onChange={(e) => setData('phone_number', e.target.value)}
                                placeholder="+234 800 000 0000" className={inputCls} />
                            {errors.phone_number && <p className={errCls}>{errors.phone_number}</p>}
                        </div>

                        <div>
                            <label className={labelCls}>LGA *</label>
                            <select value={data.lga_id}
                                onChange={(e) => setData('lga_id', e.target.value)} className={inputCls}>
                                <option value="">Select LGA…</option>
                                {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            {errors.lga_id && <p className={errCls}>{errors.lga_id}</p>}
                        </div>

                        <div>
                            <label className={labelCls}>Ward *</label>
                            <select value={data.ward_id}
                                onChange={(e) => setData('ward_id', e.target.value)}
                                disabled={!data.lga_id || loadingWards}
                                className={inputCls}>
                                <option value="">
                                    {!data.lga_id ? 'Select an LGA first…' : loadingWards ? 'Loading…' : wards.length === 0 ? 'No wards available in this LGA' : 'Select Ward…'}
                                </option>
                                {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            {errors.ward_id && <p className={errCls}>{errors.ward_id}</p>}
                            {data.lga_id && !loadingWards && wards.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">Every ward in this LGA has already been registered.</p>
                            )}
                        </div>

                        <div>
                            <label className={labelCls}>Passport Photograph *</label>
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
                                        onChange={(e) => handleFile(e.target.files[0])} />
                                </label>
                            </div>

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
                                    {backgroundWarning && (
                                        <div className={`w-full max-w-xs px-4 py-3 rounded-xl border text-center text-sm font-medium ${
                                            backgroundWarning.includes('✅') ? 'bg-green-50 border-green-200 text-green-800'
                                            : backgroundWarning.includes('❌') ? 'bg-red-50 border-red-200 text-red-800'
                                            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                                        }`}>
                                            {backgroundWarning}
                                            {backgroundWarning.includes('❌') && <p className="text-xs font-normal mt-1">Please retake with a plain white background.</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-gray-400">JPEG, PNG (max 2MB) · White background required</p>
                            {errors.passport_photograph && <p className={errCls}>{errors.passport_photograph}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold rounded-2xl shadow transition text-sm"
                        >
                            {processing ? 'Submitting…' : 'Submit'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
