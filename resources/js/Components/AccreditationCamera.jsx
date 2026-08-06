import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Camera-only capture — no file upload option, per accreditation policy.
 *
 * Mirrors the component inside Pages/Databoy/Accreditation.jsx. The two are
 * kept separate on purpose: applicant accreditation runs live on election day
 * and must not be disturbed by changes made for the APO flow.
 */
export function CameraCapture({ onCapture, busy }) {
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

export function ModalShell({ title, subtitle, onClose, closable = true, children }) {
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
