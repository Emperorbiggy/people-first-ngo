import { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { CameraCapture, ModalShell } from '@/Components/AccreditationCamera';
import ApoOfficerHeader from '@/Components/ApoOfficerHeader';

// Same windows as applicant accreditation: check-in inside a window's check-in
// range, checkout only inside that same window's PAIRED checkout range, on the
// same day. The server enforces all of it; this only greys out what it can.
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
    return new Date(iso).toDateString() === new Date().toDateString();
}

function isWithinCheckoutRange(w) {
    if (!w) return false;
    const m = minutesNow();
    return m >= w.checkoutStart && m <= w.checkoutEnd;
}

function formatTime(iso) {
    return iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
}

function CheckInModal({ officer, onClose, timeRestrictionEnabled, windows }) {
    const [step, setStep] = useState('question');
    const [suitable, setSuitable] = useState(null);
    const [file, setFile] = useState(null);
    const [image, setImage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const closed = timeRestrictionEnabled && !currentCheckinWindow(windows);

    const submit = () => {
        setSaving(true);
        setError('');
        router.post(route('databoy.apo-accreditation.check-in', officer.id), { suitable: suitable ? '1' : '0', photo: file }, {
            forceFormData: true,
            onSuccess: () => onClose(),
            onError: (e) => { setError(Object.values(e)[0] ?? 'Failed to check in.'); setSaving(false); },
        });
    };

    return (
        <ModalShell title={`Check In: ${officer.full_name}`} subtitle={`${officer.ward} · ${officer.polling_unit}`} onClose={onClose} closable={!saving}>
            {closed && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    Check-in is closed right now. It reopens at {nextCheckinWindowLabel(windows)}.
                </div>
            )}
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            {step === 'question' && (
                <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700 text-center">Is this officer present?</p>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => { setSuitable(false); setStep('camera'); }} disabled={closed}
                            className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-40 transition">
                            No
                        </button>
                        <button type="button" onClick={() => { setSuitable(true); setStep('camera'); }} disabled={closed}
                            className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition">
                            Yes
                        </button>
                    </div>
                </div>
            )}

            {step === 'camera' && (
                <>
                    <p className="text-sm text-gray-600">Take a photo of <strong>{officer.full_name}</strong> to check them in.</p>
                    <CameraCapture onCapture={(f, url) => { setFile(f); setImage(url); setStep('preview'); }} />
                </>
            )}

            {step === 'preview' && (
                <>
                    <div className="flex justify-center">
                        <img src={image} alt="Captured" className="w-48 h-48 object-cover rounded-xl border-2 border-green-400" />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => { setFile(null); setImage(null); setStep('camera'); }} disabled={saving}
                            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">
                            Retake
                        </button>
                        <button onClick={submit} disabled={saving}
                            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
                            {saving ? 'Checking in…' : 'Confirm Check-In'}
                        </button>
                    </div>
                </>
            )}
        </ModalShell>
    );
}

function CheckOutModal({ officer, onClose, timeRestrictionEnabled, windows }) {
    const [step, setStep] = useState('camera');
    const [file, setFile] = useState(null);
    const [image, setImage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const checkinWindow = windowForCheckinTime(officer.checked_in_at, windows);
    const closed = timeRestrictionEnabled && (
        !checkinWindow || !isSameDay(officer.checked_in_at) || !isWithinCheckoutRange(checkinWindow)
    );

    const submit = (match) => {
        if (!match) { setFile(null); setImage(null); setStep('camera'); return; }
        setSaving(true);
        setError('');
        router.post(route('databoy.apo-accreditation.check-out', officer.id), { match: '1', photo: file }, {
            forceFormData: true,
            onSuccess: () => onClose(),
            onError: (e) => { setError(Object.values(e)[0] ?? 'Failed to check out.'); setSaving(false); },
        });
    };

    return (
        <ModalShell title={`Check Out: ${officer.full_name}`} subtitle="Accrediting this officer queues their payment" onClose={onClose} closable={!saving}>
            {closed && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    Checkout is closed right now. It opens {checkinWindow ? checkinWindow.checkoutLabel : 'in the paired checkout window'}, on the check-in day.
                </div>
            )}
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            {step === 'camera' && (
                <>
                    <p className="text-sm text-gray-600">Take the checkout photo of <strong>{officer.full_name}</strong>.</p>
                    <CameraCapture onCapture={(f, url) => { setFile(f); setImage(url); setStep('confirm'); }} />
                </>
            )}

            {step === 'confirm' && (
                <>
                    <p className="text-sm font-semibold text-gray-700 text-center">Is this the same person who checked in?</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Check-in</p>
                            <img src={`/storage/${officer.check_in_photo_path}`} alt="Check-in" className="w-full aspect-square object-cover rounded-xl border border-gray-200" />
                        </div>
                        <div className="text-center">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Now</p>
                            <img src={image} alt="Checkout" className="w-full aspect-square object-cover rounded-xl border-2 border-green-400" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => submit(false)} disabled={saving}
                            className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition">
                            No — Retake
                        </button>
                        <button onClick={() => submit(true)} disabled={saving || closed}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
                            {saving ? 'Accrediting…' : 'Yes — Accredit'}
                        </button>
                    </div>
                </>
            )}
        </ModalShell>
    );
}

export default function ApoAccreditation({ officers, lgas, selectedLgaId, timeRestrictionEnabled, windows, accreditationEnabled = true }) {
    const { flash, databoy } = usePage().props;
    const [search, setSearch] = useState('');
    const [checkingIn, setCheckingIn] = useState(null);
    const [checkingOut, setCheckingOut] = useState(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return officers;
        return officers.filter((o) =>
            [o.full_name, o.calling_phone_number, o.ward, o.polling_unit].some((v) => (v ?? '').toLowerCase().includes(q))
        );
    }, [officers, search]);

    const done = officers.filter((o) => o.is_accredited).length;

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title="APO Accreditation" />

            <ApoOfficerHeader active="accreditation" />

            <div className="max-w-5xl mx-auto px-4 py-6">
                {!accreditationEnabled && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                        <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <div>
                            <p className="text-sm font-bold text-amber-900">APO accreditation is closed</p>
                            <p className="text-xs text-amber-700/80 mt-0.5">
                                Check-in and check-out have been turned off by the admin. You can still view the list.
                            </p>
                        </div>
                    </div>
                )}

                {flash?.success && (
                    <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select LGA</label>
                    <select
                        value={selectedLgaId ?? ''}
                        onChange={(e) => router.get(route('databoy.apo-accreditation.index'), e.target.value ? { lga_id: e.target.value } : {}, { preserveState: false })}
                        className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                    >
                        <option value="">— Choose an LGA to load its APO officers —</option>
                        {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>

                    {selectedLgaId && (
                        <div className="flex gap-2 mt-3">
                            <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                                <p className="text-lg font-bold text-gray-800">{officers.length}</p>
                                <p className="text-[11px] text-gray-500 uppercase font-semibold">APO Officers</p>
                            </div>
                            <div className="flex-1 bg-emerald-50 rounded-xl px-3 py-2 text-center">
                                <p className="text-lg font-bold text-emerald-700">{done}</p>
                                <p className="text-[11px] text-emerald-600 uppercase font-semibold">Accredited</p>
                            </div>
                        </div>
                    )}
                </div>

                {selectedLgaId && officers.length > 0 && (
                    <input
                        type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, phone, ward, polling unit…"
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white mb-4"
                    />
                )}

                {!selectedLgaId ? (
                    <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-sm text-gray-400">
                        Choose an LGA above to begin.
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-sm text-gray-400">
                        {officers.length === 0 ? 'No qualified APO officers in this LGA.' : 'No results found.'}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((o) => (
                            <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-800 truncate">{o.full_name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{o.calling_phone_number}</p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{o.ward} · {o.polling_unit}</p>
                                    </div>

                                    {o.is_accredited ? (
                                        <span className="shrink-0 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-lg">
                                            ACCREDITED
                                        </span>
                                    ) : o.checked_in_at ? (
                                        <span className="shrink-0 px-2.5 py-1 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-lg">
                                            CHECKED IN {formatTime(o.checked_in_at)}
                                        </span>
                                    ) : (
                                        <span className="shrink-0 px-2.5 py-1 bg-gray-100 text-gray-500 text-[11px] font-bold rounded-lg">
                                            NOT STARTED
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3">
                                    {o.is_accredited ? (
                                        <p className="text-xs text-emerald-600 font-medium">
                                            Accredited at {formatTime(o.accredited_at)} · payment queued
                                        </p>
                                    ) : o.checked_in_at ? (
                                        <button onClick={() => setCheckingOut(o)} disabled={!accreditationEnabled}
                                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition">
                                            {accreditationEnabled ? 'Check Out & Accredit' : 'Check-Out Closed'}
                                        </button>
                                    ) : (
                                        <button onClick={() => setCheckingIn(o)} disabled={!accreditationEnabled}
                                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition">
                                            {accreditationEnabled ? 'Check In' : 'Check-In Closed'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {checkingIn && (
                <CheckInModal officer={checkingIn} onClose={() => setCheckingIn(null)}
                    timeRestrictionEnabled={timeRestrictionEnabled} windows={windows} />
            )}
            {checkingOut && (
                <CheckOutModal officer={checkingOut} onClose={() => setCheckingOut(null)}
                    timeRestrictionEnabled={timeRestrictionEnabled} windows={windows} />
            )}
        </div>
    );
}
