import { Head } from '@inertiajs/react';

export default function RegistrationClosed() {
    return (
        <>
            <Head title="Registration Closed" />

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900 to-orange-900 flex items-center justify-center py-10 px-4">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -left-32 w-96 h-96 bg-amber-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />
                    <div className="absolute -bottom-40 -right-32 w-96 h-96 bg-orange-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1.5s' }} />
                </div>

                <div className="relative z-10 max-w-md w-full text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-2xl mb-4 rotate-3">
                        <svg className="w-8 h-8 text-red-500 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                                d="M18.364 5.636L5.636 18.364M12 3a9 9 0 100 18 9 9 0 000-18z" />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-bold text-white drop-shadow-lg tracking-tight">
                        Registration Closed
                    </h1>
                    <p className="text-white/70 mt-3 text-sm">
                        Transport agent registration is currently closed. Please contact the admin or check back later.
                    </p>

                    <div className="mt-6 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl px-5 py-4 text-sm text-gray-600">
                        Registration has been temporarily disabled by the administrator.
                        <div className="mt-3">
                            <a href={route('transport-agent.login')}
                                className="text-amber-700 hover:underline font-bold">
                                Already registered? Login here
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
