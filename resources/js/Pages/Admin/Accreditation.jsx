import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

function CaptureModal({ application, onClose }) {
    const [showCamera, setShowCamera] = useState(true);
    const [capturedImage, setCapturedImage] = useState(null);
    const [capturedFile, setCapturedFile] = useState(null);
    const [cameraError, setCameraError] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const [facingMode, setFacingMode] = useState('user');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const retryRef = useRef(null);
    const fileRef = useRef(null);

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

    useEffect(() => () => releaseStream(), []);

    const capturePhoto = useCallback(async () => {
        if (!videoRef.current || !streamRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const imageSrc = canvas.toDataURL('image/jpeg');
        const blob = await (await fetch(imageSrc)).blob();
        const file = new File([blob], 'accreditation.jpg', { type: 'image/jpeg' });
        setCapturedFile(file);
        setCapturedImage(imageSrc);
        releaseStream();
        setShowCamera(false);
    }, []);

    const handleFile = (file) => {
        if (!file) return;
        setCapturedFile(file);
        setCapturedImage(URL.createObjectURL(file));
        releaseStream();
        setShowCamera(false);
    };

    const retake = () => {
        setCapturedImage(null);
        setCapturedFile(null);
        setCameraReady(false);
        setShowCamera(true);
    };

    const handleSave = () => {
        if (!capturedFile) return;
        setSaving(true);
        setError('');
        router.post(route('admin.accreditation.accredit', application.id), { photo: capturedFile }, {
            forceFormData: true,
            onSuccess: () => onClose(),
            onError: (e) => { setError(Object.values(e)[0] ?? 'Failed to accredit.'); setSaving(false); },
        });
    };

    const handleClose = () => { releaseStream(); onClose(); };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={!saving ? handleClose : undefined} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-800">Accredit {application.full_name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Take or upload a fresh photo to replace their record photo.</p>
                    </div>
                    <button onClick={handleClose} disabled={saving} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

                    {showCamera ? (
                        <>
                            {cameraError ? (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                                    <p className="text-red-600 text-sm font-medium mb-2">{cameraError}</p>
                                    <button type="button" onClick={() => acquireCamera(facingMode)} className="text-sm text-blue-600 underline">Try again</button>
                                </div>
                            ) : (
                                <div className="relative bg-black rounded-xl overflow-hidden" style={{ minHeight: 260 }}>
                                    {!cameraReady && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                                            <p className="text-white text-sm">Starting camera…</p>
                                        </div>
                                    )}
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl"
                                        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                                </div>
                            )}

                            <div className="flex justify-center gap-2 flex-wrap">
                                <button type="button"
                                    onClick={() => { setCameraReady(false); setFacingMode((f) => (f === 'user' ? 'environment' : 'user')); }}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition">
                                    Flip Camera
                                </button>
                                <button type="button" onClick={capturePhoto} disabled={!cameraReady}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
                                    Capture
                                </button>
                                <label className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded-xl transition cursor-pointer">
                                    Upload File
                                    <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png" className="hidden"
                                        onChange={(e) => handleFile(e.target.files[0])} />
                                </label>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-center">
                                <img src={capturedImage} alt="Captured" className="w-48 h-48 object-cover rounded-xl border-2 border-green-400" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={retake} disabled={saving}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                                    Retake
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
                                    {saving ? 'Saving…' : 'Mark as Accredited'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function Accreditation({ applications = [] }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [capturingApp, setCapturingApp] = useState(null);

    const filtered = search.trim()
        ? applications.filter((app) => {
            const q = search.toLowerCase();
            return (
                app.full_name?.toLowerCase().includes(q) ||
                app.calling_phone_number?.toLowerCase().includes(q) ||
                app.databoy?.full_name?.toLowerCase().includes(q) ||
                app.ward?.name?.toLowerCase().includes(q) ||
                app.lga?.name?.toLowerCase().includes(q)
            );
        })
        : applications;

    return (
        <AdminLayout title="Accreditation">
            {capturingApp && (
                <CaptureModal application={capturingApp} onClose={() => setCapturingApp(null)} />
            )}

            <div className="max-w-5xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Accreditation</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Search for a registered applicant, take their photo, and mark them as accredited.</p>
                </div>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                        {flash.success}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Applicants</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {applications.length} record{applications.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name, phone, ward, or databoy…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
                            />
                        </div>
                    </div>

                    {applications.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">No applicants registered yet.</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No applicants match that search.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['#', 'Applicant', 'Registered By', 'Ward', 'Status', 'Actions'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((app, idx) => (
                                        <tr key={app.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-xs text-gray-400">{idx + 1}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    {app.passport_photograph_path ? (
                                                        <img src={`/storage/${app.passport_photograph_path}`} alt={app.full_name}
                                                            className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 shrink-0" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                            <span className="text-indigo-600 text-xs font-bold">{app.full_name?.charAt(0)}</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{app.full_name}</p>
                                                        <p className="text-xs text-gray-400">{app.calling_phone_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg whitespace-nowrap">
                                                    {app.databoy?.full_name ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{app.ward?.name ?? '—'}</td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                {app.is_accredited ? (
                                                    <span className="inline-flex px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg">Accredited</span>
                                                ) : (
                                                    <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => setCapturingApp(app)}
                                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                                                >
                                                    {app.is_accredited ? 'Re-accredit' : 'Accredit'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </AdminLayout>
    );
}
