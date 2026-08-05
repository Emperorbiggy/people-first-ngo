import { useState } from 'react';
import { Head } from '@inertiajs/react';

export default function Check() {
    const [phone, setPhone] = useState('');
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState(null); // null | { found, ... }
    const [error, setError] = useState('');

    const isValid = /^\d{11}$/.test(phone);

    const onPhoneChange = (e) => {
        // Digits only, capped at 11 — the field can never hold anything else.
        setPhone(e.target.value.replace(/\D/g, '').slice(0, 11));
        setResult(null);
        setError('');
    };

    const check = async (e) => {
        e.preventDefault();
        if (!isValid || checking) return;

        setChecking(true);
        setResult(null);
        setError('');

        try {
            const res = await fetch(`${route('check.lookup')}?phone=${phone}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });

            if (res.status === 429) {
                setError('Too many checks. Please wait a minute and try again.');
                return;
            }
            if (!res.ok) {
                setError('We could not complete the check. Please try again.');
                return;
            }

            setResult(await res.json());
        } catch {
            setError('Network error. Check your connection and try again.');
        } finally {
            setChecking(false);
        }
    };

    const reset = () => {
        setPhone('');
        setResult(null);
        setError('');
    };

    return (
        <>
            <Head title="Check Acknowledgement Slip" />

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-emerald-800 flex items-center justify-center p-4">
                {/* Ambient blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -left-32 w-96 h-96 bg-emerald-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />
                    <div className="absolute -bottom-40 -right-32 w-96 h-96 bg-indigo-400 rounded-full mix-blend-screen filter blur-3xl opacity-25 animate-pulse" style={{ animationDelay: '1.5s' }} />
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-300 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2.5s' }} />
                </div>

                <div className="relative z-10 w-full max-w-lg">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl mb-5 rotate-3">
                            <svg className="w-10 h-10 text-emerald-600 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg tracking-tight">Check Acknowledgement Slip</h1>
                        <p className="text-white/70 mt-3 text-sm max-w-sm mx-auto">
                            Enter the 11-digit phone number you registered with to view and download your acknowledgement slip.
                        </p>
                    </div>

                    {/* Card */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-7 sm:p-8">
                        <form onSubmit={check} className="space-y-5">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="phone" className="block text-sm font-bold text-gray-700">
                                        Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <span className={`text-xs font-semibold tabular-nums ${isValid ? 'text-emerald-600' : 'text-gray-400'}`}>
                                        {phone.length}/11
                                    </span>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="phone"
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="tel"
                                        autoFocus
                                        value={phone}
                                        onChange={onPhoneChange}
                                        placeholder="e.g. 08012345678"
                                        className={`w-full pl-12 pr-11 py-3.5 text-base tracking-wider tabular-nums border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                                            isValid
                                                ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-200'
                                                : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-200'
                                        }`}
                                    />
                                    {isValid && (
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                <p className="mt-2 text-xs text-gray-400">
                                    {phone.length > 0 && !isValid
                                        ? `${11 - phone.length} more digit${11 - phone.length === 1 ? '' : 's'} to go.`
                                        : 'Numbers only — 11 digits.'}
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={!isValid || checking}
                                className={`w-full py-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                                    isValid && !checking
                                        ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                {checking ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Checking…
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        Check
                                    </>
                                )}
                            </button>
                        </form>

                        {error && (
                            <div className="mt-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-xs text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Found */}
                        {result?.found && (
                            <div className="mt-6 animate-[fadeIn_.3s_ease-out]">
                                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-5">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-emerald-900">Acknowledgement slip found</p>
                                            <p className="text-xs text-emerald-700/80 mt-0.5 break-all">{result.file_name}</p>
                                            <p className="text-[11px] text-emerald-700/60 mt-1">
                                                PDF · {result.size} · Uploaded {result.updated_at}
                                            </p>
                                        </div>
                                    </div>

                                </div>

                                {/* Preview leads — they see the slip before deciding to save it */}
                                <div className="mt-4 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
                                    <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                        <span className="ml-2 text-[11px] font-medium text-gray-500">Preview</span>
                                    </div>
                                    <iframe
                                        title="Acknowledgement slip preview"
                                        src={result.view_url}
                                        className="w-full h-72 sm:h-[26rem] bg-white"
                                    />
                                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
                                        <p className="text-[11px] text-gray-400">Can't see it? Use Open Slip below.</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
                                    <a
                                        href={result.view_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-3 px-4 rounded-xl bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-sm font-bold text-center transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Open Slip
                                    </a>
                                    <a
                                        href={result.download_url}
                                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-bold text-center shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download Slip
                                    </a>
                                </div>

                                <button
                                    type="button"
                                    onClick={reset}
                                    className="mt-4 w-full text-xs font-semibold text-gray-500 hover:text-indigo-600 transition"
                                >
                                    Check another number
                                </button>
                            </div>
                        )}

                        {/* Not found */}
                        {result && !result.found && (
                            <div className="mt-6 rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-5 text-center animate-[fadeIn_.3s_ease-out]">
                                <div className="inline-flex w-12 h-12 rounded-full bg-amber-100 items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-bold text-amber-900">No acknowledgement slip found</p>
                                <p className="text-xs text-amber-700/80 mt-1.5 max-w-xs mx-auto">
                                    No slip has been uploaded for <span className="font-semibold tabular-nums">{phone}</span> yet.
                                    Confirm the number is correct, or check back later.
                                </p>
                            </div>
                        )}

                        <p className="text-center text-xs text-gray-400 mt-6">
                            Slips are released only to the phone number they were filed under.
                        </p>
                    </div>
                </div>
            </div>

            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
        </>
    );
}
