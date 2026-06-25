import { Head, Link, useForm } from '@inertiajs/react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({ email: '', password: '', remember: false });

    const submit = (e) => {
        e.preventDefault();
        post(route('databoy.login.post'));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-700 flex items-center justify-center p-4">
            <Head title="Databoy Login" />
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Databoy Portal</h1>
                    <p className="text-indigo-300 text-sm mt-1">People First NGO</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Sign in to your account</h2>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="firstname@peoplefirst.org"
                                autoComplete="email"
                                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                autoComplete="current-password"
                                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="accent-indigo-600"
                            />
                            <span className="text-sm text-gray-600">Remember me</span>
                        </label>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm"
                        >
                            {processing ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>

                    <p className="mt-5 text-center text-sm text-gray-500">
                        Not registered yet?{' '}
                        <Link href={route('databoy.register')} className="text-indigo-600 hover:underline font-medium">
                            Register here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
