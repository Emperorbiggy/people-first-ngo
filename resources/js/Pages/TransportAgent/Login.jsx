import { Head, Link, useForm } from '@inertiajs/react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        phone_number: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('transport-agent.login.post'));
    };

    const field = 'w-full px-4 py-3.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition';

    return (
        <>
            <Head title="Transport Agent Login" />

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900 to-orange-900 flex items-center justify-center p-4">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-32 w-96 h-96 bg-amber-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />
                    <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-orange-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1.5s' }} />
                </div>

                <div className="relative z-10 w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-2xl mb-4 rotate-3">
                            <svg className="w-8 h-8 text-amber-600 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                                    d="M8 17h8m-8 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m12 0a2 2 0 104 0m-4 0a2 2 0 114 0M3 6h13v11H3V6zm13 4h3.5L22 13v4h-6v-7z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white drop-shadow-lg">Transport Agent</h1>
                        <p className="text-white/70 mt-2 text-sm">Sign in with the phone number you registered with.</p>
                    </div>

                    <form onSubmit={submit} className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                            <input type="tel" inputMode="numeric" autoFocus
                                value={data.phone_number}
                                onChange={(e) => setData('phone_number', e.target.value.replace(/\D/g, '').slice(0, 11))}
                                placeholder="08012345678"
                                className={`${field} tabular-nums tracking-wide`} />
                            {errors.phone_number && (
                                <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                    <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-xs text-red-700">{errors.phone_number}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                            <input type="password" value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="The 6-digit password you were given"
                                className={field} />
                            {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
                        </div>

                        <label className="flex items-center gap-2 text-xs text-gray-500">
                            <input type="checkbox" checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                            Keep me signed in on this phone
                        </label>

                        <button type="submit" disabled={processing || !data.phone_number || !data.password}
                            className="w-full py-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 shadow-lg hover:shadow-xl transition-all">
                            {processing ? 'Signing in…' : 'Sign In'}
                        </button>

                        <p className="text-center text-xs text-gray-400">
                            Not registered yet?{' '}
                            <Link href={route('transport-agent.create')} className="font-semibold text-amber-600 hover:text-amber-800">
                                Register here
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </>
    );
}
