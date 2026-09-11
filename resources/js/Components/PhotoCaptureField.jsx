import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A live camera sheet.
 *
 * The `capture` attribute on a file input is only a hint, and Android's picker
 * routinely ignores it and offers the gallery instead — which is exactly what
 * agents in the field ran into. Opening the camera ourselves through
 * getUserMedia is the only way to be sure "Take photo" means the camera.
 */
function CameraSheet({ facing, onShoot, onClose }) {
    const [error, setError] = useState('');
    const [ready, setReady] = useState(false);
    const [facingMode, setFacingMode] = useState(facing);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const retryRef = useRef(null);

    const release = () => {
        if (retryRef.current) clearTimeout(retryRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    const acquire = useCallback(async (mode, attempt = 0) => {
        release();
        setError('');

        if (!navigator.mediaDevices?.getUserMedia) {
            // No camera API at all — an old browser, or the page is being served
            // over plain HTTP, where browsers refuse it outright.
            setError('This browser will not open the camera here. Use Upload instead.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            setReady(true);
        } catch (err) {
            // The camera is often still releasing from another app for a moment
            // after it is opened; a few retries clear that.
            if ((err.name === 'AbortError' || err.name === 'NotReadableError') && attempt < 4) {
                retryRef.current = setTimeout(() => acquire(mode, attempt + 1), 700);
            } else if (err.name === 'NotAllowedError') {
                setError('Camera permission was denied. Allow camera access for this site, or use Upload.');
            } else {
                setError('Could not open the camera. Close any other app using it, or use Upload.');
            }
        }
    }, []);

    useEffect(() => {
        acquire(facingMode);
        return release;
    }, [facingMode, acquire]);

    const shoot = async () => {
        const video = videoRef.current;
        if (!video || !streamRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        // 0.92 straight off the camera; the server compresses properly on arrival.
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));

        release();
        onShoot(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
    };

    const close = () => {
        release();
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={close} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-sm">Take photo</h3>
                    <button type="button" onClick={close} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4">
                    {error ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                            <p className="text-sm font-medium text-red-700">{error}</p>
                            <button type="button" onClick={() => acquire(facingMode)}
                                className="mt-2 text-sm text-amber-700 underline">
                                Try again
                            </button>
                        </div>
                    ) : (
                        <div className="relative bg-black rounded-xl overflow-hidden" style={{ minHeight: 260 }}>
                            {!ready && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900">
                                    <p className="text-white text-sm">Starting camera…</p>
                                </div>
                            )}
                            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl"
                                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                        </div>
                    )}

                    {!error && (
                        <div className="mt-4 flex justify-center gap-2">
                            <button type="button"
                                onClick={() => { setReady(false); setFacingMode((f) => (f === 'user' ? 'environment' : 'user')); }}
                                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition">
                                Flip camera
                            </button>
                            <button type="button" onClick={shoot} disabled={!ready}
                                className="px-8 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-bold transition">
                                Capture
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

/**
 * A photo slot with both routes in: "Take photo" opens the camera in the page,
 * "Upload" opens the picker for a file already on the device.
 *
 * `existing` is a photo already on file — shown until a new one is chosen, so
 * replacing one is the same gesture as adding the first.
 */
export default function PhotoCaptureField({
    label,
    hint,
    required,
    file,
    existing,
    error,
    onPick,
    onClear,
    camera = 'environment',
    tall = false,
}) {
    const uploadRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const [shooting, setShooting] = useState(false);

    useEffect(() => {
        if (!file) {
            setPreview(null);
            return;
        }

        const url = URL.createObjectURL(file);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    const shown = preview || existing;

    const shoot = (taken) => {
        setShooting(false);
        onPick(taken);
    };

    return (
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>

            <input ref={uploadRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => onPick(e.target.files[0] || null)} />

            {shooting && (
                <CameraSheet facing={camera} onShoot={shoot} onClose={() => setShooting(false)} />
            )}

            {shown ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200">
                    <img src={shown} alt={label} className={`w-full object-cover ${tall ? 'h-56' : 'h-44'}`} />
                    <div className="absolute inset-x-0 bottom-0 flex divide-x divide-white/20 bg-black/60 text-white text-xs font-medium">
                        <button type="button" onClick={() => setShooting(true)} className="flex-1 py-2.5 hover:bg-black/30">
                            Retake
                        </button>
                        <button type="button" onClick={() => uploadRef.current?.click()} className="flex-1 py-2.5 hover:bg-black/30">
                            Change file
                        </button>
                        {file && (
                            <button type="button" onClick={onClear} className="flex-1 py-2.5 hover:bg-black/30">
                                Remove
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className={`rounded-2xl border-2 border-dashed ${error ? 'border-red-300 bg-red-50/40' : 'border-gray-200'} p-4`}>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setShooting(true)}
                            className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"
                                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-xs font-bold">Take photo</span>
                        </button>

                        <button type="button" onClick={() => uploadRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"
                                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12l-4 4m4-4l4 4" />
                            </svg>
                            <span className="text-xs font-bold">Upload</span>
                        </button>
                    </div>
                    {hint && <p className="mt-3 text-center text-xs text-gray-400">{hint}</p>}
                </div>
            )}

            {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </div>
    );
}
