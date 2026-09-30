import { Head, useForm } from '@inertiajs/react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('transport-admin.login.post'));
    };

    const field = 'w-full px-4 py-3 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition';

    return (
        <>
            <Head title="Transport Panel" />

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-7">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/20 rounded-2xl mb-4">
                            <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                                    d="M8 17h8m-8 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m12 0a2 2 0 104 0m-4 0a2 2 0 114 0M3 6h13v11H3V6zm13 4h3.5L22 13v4h-6v-7z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Transport Panel</h1>
                        <p className="text-slate-400 text-sm mt-1.5">Agents and the vehicle register</p>
                    </div>

                    <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                            <input type="email" value={data.email} autoComplete="username"
                                onChange={(e) => setData('email', e.target.value)}
                                className={field} />
                            {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                            <input type="password" value={data.password} autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                                className={field} />
                            {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
                        </div>

                        <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input type="checkbox" checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                            Keep me signed in
                        </label>

                        <button type="submit" disabled={processing}
                            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 transition">
                            {processing ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>

                    <p className="text-center text-xs text-slate-500 mt-5">
                        Accounts are issued by the administrator.
                    </p>
                </div>
            </div>
        </>
    );
}
