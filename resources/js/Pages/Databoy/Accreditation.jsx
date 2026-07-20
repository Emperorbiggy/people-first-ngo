import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import DataboyLayout from '@/Layouts/DataboyLayout';

// Check-in is only allowed inside a window's check-in range. Checkout for
// that same check-in is only allowed inside the PAIRED checkout range (a
// later, separate window), on the same calendar day as check-in.
// The applicable windows come from the server per-applicant (`app.windows`)
// since a ward may have a one-off override for today.
const FALLBACK_WINDOWS = [
    {
        checkinStart: 7 * 60, checkinEnd: 12 * 60,
        checkoutStart: 12 * 60, checkoutEnd: 15 * 60,
        checkinLabel: '7:00 AM–12:00 PM',
        checkoutLabel: '12:00 PM–3:00 PM',
    },
    {
        checkinStart: 15 * 60, checkinEnd: 17 * 60,
        checkoutStart: 17 * 60, checkoutEnd: 23 * 60 + 59,
        checkinLabel: '3:00 PM–5:00 PM',
        checkoutLabel: '5:00 PM onward',
    },
];

function minutesNow() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
}

function minutesFromIso(iso) {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
}

function currentCheckinWindow(windows) {
    const m = minutesNow();
    return windows.find((w) => m >= w.checkinStart && m <= w.checkinEnd) ?? null;
}

function nextCheckinWindowLabel(windows) {
    const m = minutesNow();
    const upcoming = windows.find((w) => m < w.checkinStart);
    return upcoming ? upcoming.checkinLabel : windows[0].checkinLabel + ' (tomorrow)';
}

function windowForCheckinTime(iso, windows) {
    if (!iso) return null;
    const m = minutesFromIso(iso);
    return windows.find((w) => m >= w.checkinStart && m <= w.checkinEnd) ?? null;
}

function isSameDay(iso) {
    if (!iso) return false;
    const a = new Date(iso);
    const b = new Date();
    return a.toDateString() === b.toDateString();
}

function isWithinCheckoutRange(window) {
    if (!window) return false;
    const m = minutesNow();
    return m >= window.checkoutStart && m <= window.checkoutEnd;
}

function formatTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function suitabilityLabel(isSuitable) {
    if (isSuitable === null || isSuitable === undefined) return '';
    return isSuitable ? 'Suitable' : 'Not Suitable';
}

/**
 * Camera-only capture — no file upload option, per accreditation policy.
 */
function CameraCapture({ onCapture, busy }) {
    const [cameraError, setCameraError] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const [facingMode, setFacingMode] = useState('user');

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const retryRef = useRef(null);

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
        acquireCamera(facingMode);
        return () => releaseStream();
    }, [facingMode]);

    const capture = useCallback(async () => {
        if (!videoRef.current || !streamRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        releaseStream();
        onCapture(file, dataUrl);
    }, [onCapture]);

    if (cameraError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                <p className="text-red-600 text-sm font-medium mb-2">{cameraError}</p>
                <button type="button" onClick={() => acquireCamera(facingMode)} className="text-sm text-blue-600 underline">Try again</button>
            </div>
        );
    }

    return (
        <>
            <div className="relative bg-black rounded-xl overflow-hidden" style={{ minHeight: 260 }}>
                {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                        <p className="text-white text-sm">Starting camera…</p>
                    </div>
                )}
                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl"
                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
            </div>
            <div className="flex justify-center gap-2 flex-wrap mt-4">
                <button type="button"
                    onClick={() => { setCameraReady(false); setFacingMode((f) => (f === 'user' ? 'environment' : 'user')); }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition">
                    Flip Camera
                </button>
                <button type="button" onClick={capture} disabled={!cameraReady || busy}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
                    Capture
                </button>
            </div>
        </>
    );
}

function ModalShell({ title, subtitle, onClose, closable = true, children }) {
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={closable ? onClose : undefined} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-800">{title}</h3>
                        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                    </div>
                    {closable && (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                <div className="p-5 space-y-4 overflow-y-auto">{children}</div>
            </div>
        </div>,
        document.body
    );
}

function CheckInModal({ application, onClose, timeRestrictionEnabled, windows }) {
    const [step, setStep] = useState('question'); // question | camera | preview
    const [suitable, setSuitable] = useState(null);
    const [capturedFile, setCapturedFile] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const window_ = currentCheckinWindow(windows);
    const closedForCheckIn = timeRestrictionEnabled && !window_;

    const answerSuitability = (value) => {
        setSuitable(value);
        setStep('camera');
    };

    const handleCapture = (file, dataUrl) => {
        setCapturedFile(file);
        setCapturedImage(dataUrl);
        setStep('preview');
    };

    const retake = () => {
        setCapturedFile(null);
        setCapturedImage(null);
        setStep('camera');
    };

    const submit = () => {
        setSaving(true);
        setError('');
        router.post(route('databoy.accreditation.check-in', application.id), { suitable: suitable ? '1' : '0', photo: capturedFile }, {
            forceFormData: true,
            onSuccess: () => onClose(),
            onError: (e) => { setError(Object.values(e)[0] ?? 'Failed to check in.'); setSaving(false); },
        });
    };

    return (
        <ModalShell title={`Check In: ${application.full_name}`} onClose={onClose} closable={!saving}>
            {closedForCheckIn && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    Check-in is closed right now. It reopens at {nextCheckinWindowLabel(windows)}.
                </div>
            )}
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            {step === 'question' && (
                <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700 text-center">Is the person suitable for APO or for Monitoring?</p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => answerSuitability(false)}
                            disabled={closedForCheckIn}
                            className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-40 transition"
                        >
                            No
                        </button>
                        <button
                            type="button"
                            onClick={() => answerSuitability(true)}
                            disabled={closedForCheckIn}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition"
                        >
                            Yes
                        </button>
                    </div>
                </div>
            )}

            {step === 'camera' && (
                <>
                    <p className="text-sm text-gray-600">Take a photo of <strong>{application.full_name}</strong> to check them in.</p>
                    <CameraCapture onCapture={handleCapture} />
                </>
            )}

            {step === 'preview' && (
                <>
                    <div className="flex justify-center">
                        <img src={capturedImage} alt="Captured" className="w-48 h-48 object-cover rounded-xl border-2 border-green-400" />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={retake} disabled={saving}
                            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                            Retake
                        </button>
                        <button onClick={submit} disabled={saving}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
                            {saving ? 'Checking in…' : 'Confirm Check-In'}
                        </button>
                    </div>
                </>
            )}
        </ModalShell>
    );
}

function CheckOutModal({ application, onClose, timeRestrictionEnabled, windows }) {
    const [step, setStep] = useState('camera'); // camera | confirm
    const [capturedFile, setCapturedFile] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const checkinWindow = windowForCheckinTime(application.checked_in_at, windows);
    const closedForCheckOut = timeRestrictionEnabled && (
        !checkinWindow || !isSameDay(application.checked_in_at) || !isWithinCheckoutRange(checkinWindow)
    );
    const checkInPhotoUrl = `/storage/${application.check_in_photo_path}`;

    const handleCapture = (file, dataUrl) => {
        setCapturedFile(file);
        setCapturedImage(dataUrl);
        setStep('confirm');
    };

    const retake = () => {
        setCapturedFile(null);
        setCapturedImage(null);
        setStep('camera');
    };

    const submit = () => {
        setSaving(true);
        setSubmitError('');
        router.post(route('databoy.accreditation.check-out', application.id), {
            photo: capturedFile,
            match: '1',
        }, {
            forceFormData: true,
            onSuccess: () => onClose(),
            onError: (e) => { setSubmitError(Object.values(e)[0] ?? 'Failed to check out.'); setSaving(false); },
        });
    };

    return (
        <ModalShell
            title={`Check Out: ${application.full_name}`}
            subtitle={`Checked in (${suitabilityLabel(application.is_suitable)}) at ${formatTime(application.checked_in_at)}`}
            onClose={onClose}
            closable={!saving}
        >
            {closedForCheckOut && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    {checkinWindow
                        ? `Checkout is only allowed between ${checkinWindow.checkoutLabel} (based on the check-in time), on the same day.`
                        : 'Checkout window could not be determined from the check-in time.'}
                </div>
            )}
            {submitError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submitError}</p>}

            {step === 'camera' && (
                <>
                    <p className="text-sm text-gray-600">Take a fresh photo of <strong>{application.full_name}</strong> to verify their identity and check them out.</p>
                    <CameraCapture onCapture={handleCapture} />
                </>
            )}

            {step === 'confirm' && (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                            <img src={checkInPhotoUrl} alt="Check-in" className="w-full aspect-square object-cover rounded-xl border-2 border-gray-200" />
                            <p className="text-xs text-gray-400 mt-1">Check-in ({formatTime(application.checked_in_at)})</p>
                        </div>
                        <div className="text-center">
                            <img src={capturedImage} alt="Checkout" className="w-full aspect-square object-cover rounded-xl border-2 border-gray-200" />
                            <p className="text-xs text-gray-400 mt-1">Checkout (now)</p>
                        </div>
                    </div>

                    <p className="text-sm font-semibold text-gray-700 text-center">Is this the same person?</p>

                    <div className="flex gap-3">
                        <button onClick={retake} disabled={saving}
                            className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50">
                            No, doesn't match
                        </button>
                        <button onClick={submit} disabled={saving || closedForCheckOut}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
                            {saving ? 'Checking out…' : 'Yes, confirm match'}
                        </button>
                    </div>
                </>
            )}
        </ModalShell>
    );
}

function StatusCell({ app }) {
    if (app.is_accredited) {
        return (
            <div>
                <span className="inline-flex px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg">Accredited</span>
                <p className="text-xs text-gray-400 mt-1">{formatTime(app.accredited_at)}</p>
            </div>
        );
    }
    if (app.checked_in_at) {
        return (
            <div>
                <span className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">Checked In</span>
                <p className="text-xs text-gray-400 mt-1">{suitabilityLabel(app.is_suitable)} · {formatTime(app.checked_in_at)}</p>
            </div>
        );
    }
    return <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg">Pending</span>;
}

export default function Accreditation({ applications = [], timeRestrictionEnabled = true, role = 'databoy', lgas = [], selectedLgaId = null, defaultWindows = [] }) {
    const isAccreditationBoy = role === 'accreditation_boy';
    const [search, setSearch] = useState('');
    const [lgaId, setLgaId] = useState(selectedLgaId ?? '');
    const [checkingInApp, setCheckingInApp] = useState(null);
    const [checkingOutApp, setCheckingOutApp] = useState(null);
    const windows = defaultWindows.length ? defaultWindows : FALLBACK_WINDOWS;
    const window_ = currentCheckinWindow(windows);

    const filtered = search.trim()
        ? applications.filter((app) => {
            const q = search.toLowerCase();
            return (
                app.full_name?.toLowerCase().includes(q) ||
                app.calling_phone_number?.toLowerCase().includes(q)
            );
        })
        : applications;

    const handleLgaChange = (id) => {
        setLgaId(id);
        setSearch('');
        router.get(route('databoy.accreditation.index'), id ? { lga_id: id } : {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <DataboyLayout title="Accreditation">
            {checkingInApp && (
                <CheckInModal
                    application={checkingInApp}
                    onClose={() => setCheckingInApp(null)}
                    timeRestrictionEnabled={timeRestrictionEnabled}
                    windows={checkingInApp.windows?.length ? checkingInApp.windows : windows}
                />
            )}
            {checkingOutApp && (
                <CheckOutModal
                    application={checkingOutApp}
                    onClose={() => setCheckingOutApp(null)}
                    timeRestrictionEnabled={timeRestrictionEnabled}
                    windows={checkingOutApp.windows?.length ? checkingOutApp.windows : windows}
                />
            )}

            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-800">Accreditation</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    {isAccreditationBoy
                        ? 'Select an LGA, search for a person across all wards, then check them in or out.'
                        : 'Search the applicants you registered, check them in on arrival, and check them out to accredit them.'}
                </p>
            </div>

            {isAccreditationBoy && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">LGA</label>
                    <select
                        value={lgaId}
                        onChange={(e) => handleLgaChange(e.target.value)}
                        className="w-full sm:w-72 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                        <option value="">Select LGA…</option>
                        {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
            )}

            {timeRestrictionEnabled ? (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium mb-4 ${
                    window_ ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-amber-50 border border-amber-200 text-amber-700'
                }`}>
                    {window_
                        ? `Check-in is OPEN (${window_.checkinLabel}) — checkout for this window opens at ${window_.checkoutLabel}`
                        : `Check-in is CLOSED — next window: ${nextCheckinWindowLabel(windows)}`}
                </div>
            ) : (
                <div className="rounded-xl px-4 py-3 text-sm font-medium mb-4 bg-gray-50 border border-gray-200 text-gray-600">
                    Time restriction is disabled — check-in/check-out is allowed any time.
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{isAccreditationBoy ? 'Applicants' : 'My Applicants'}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {applications.length} record{applications.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by name or phone…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                        />
                    </div>
                </div>

                {isAccreditationBoy && !lgaId ? (
                    <div className="py-16 text-center text-sm text-gray-400">Select an LGA above to see applicants.</div>
                ) : applications.length === 0 ? (
                    <div className="py-16 text-center text-sm text-gray-400">
                        {isAccreditationBoy ? 'No applicants found in this LGA.' : "You haven't registered any applicants yet."}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">No applicants match that search.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-50 text-left">
                                    {(isAccreditationBoy ? ['#', 'Applicant', 'Ward', 'Status', 'Actions'] : ['#', 'Applicant', 'Status', 'Actions']).map((h) => (
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
                                                {app.check_in_photo_path ? (
                                                    <img src={`/storage/${app.check_in_photo_path}`} alt={app.full_name}
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
                                        {isAccreditationBoy && (
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{app.ward?.name ?? '—'}</td>
                                        )}
                                        <td className="px-5 py-3 whitespace-nowrap"><StatusCell app={app} /></td>
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            {app.is_accredited ? (
                                                <span className="text-xs text-gray-300">—</span>
                                            ) : app.checked_in_at ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setCheckingOutApp(app)}
                                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                                >
                                                    Check Out
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setCheckingInApp(app)}
                                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                                                >
                                                    Check In
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
