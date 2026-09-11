import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';

export default function Success({ registered = null }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        const text = `Phone: ${registered.phone}\nPassword: ${registered.password}`;
        navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
    };

    return (
        <>
            <Head title="Registration Received" />

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900 to-orange-900 flex items-center justify-center p-4 py-10">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -left-32 w-96 h-96 bg-amber-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />
                </div>

                <div className="relative z-10 w-full max-w-md">
                    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-5">
                            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h1 className="text-2xl font-bold text-gray-800">
                            {registered?.updated ? 'Registration Updated' : 'Registration Received'}
                        </h1>

                        {registered ? (
                            <>
                                <p className="text-sm text-gray-500 mt-2">
                                    {registered.updated
                                        ? 'Your existing registration has been corrected. Your login is unchanged.'
                                        : `You are registered to cover ${registered.lga}.`}
                                </p>

                                <div className="mt-5 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3 text-left">
                                    <p className="text-sm font-bold text-gray-800">{registered.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{registered.lga}</p>
                                    {registered.account_name && (
                                        <p className="text-xs text-emerald-700 mt-1.5">
                                            Payments to <span className="font-semibold">{registered.account_name}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Shown once, at registration. After this only an
                                    admin can read it back out. */}
                                {registered.password && (
                                    <div className="mt-4 rounded-2xl bg-amber-50 border-2 border-amber-300 px-4 py-4 text-left">
                                        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                            Your login details — save these now
                                        </p>

                                        <div className="mt-3 space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs text-amber-800/70">Phone number</span>
                                                <span className="text-sm font-bold text-amber-900 tabular-nums">{registered.phone}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs text-amber-800/70">Password</span>
                                                <span className="text-lg font-bold text-amber-900 tracking-widest tabular-nums">{registered.password}</span>
                                            </div>
                                        </div>

                                        <button onClick={copy}
                                            className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold text-amber-800 bg-white border border-amber-300 hover:bg-amber-100 transition">
                                            {copied ? 'Copied ✓' : 'Copy login details'}
                                        </button>

                                        <p className="text-[11px] text-amber-700/70 mt-2">
                                            This password is shown only once. Write it down before leaving this page.
                                        </p>
                                    </div>
                                )}

                                <Link href={route('transport-agent.login')}
                                    className="block mt-5 w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg transition-all">
                                    Go to login
                                </Link>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500 mt-2">Your registration has been recorded.</p>
                        )}

                        <Link href={route('transport-agent.create')}
                            className="inline-block mt-4 text-sm font-semibold text-amber-600 hover:text-amber-800">
                            Register someone else →
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
