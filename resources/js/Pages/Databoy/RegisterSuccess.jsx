import { Head, Link } from '@inertiajs/react';

export default function RegisterSuccess({ login_email, login_password }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-gray-50 flex items-center justify-center p-4">
            <Head title="Registration Successful" />
            <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Registration Successful!</h1>
                    <p className="text-sm text-gray-500 mt-1">Your databoy account has been created.</p>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 text-left space-y-3">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Your Login Credentials</p>
                    <div>
                        <p className="text-xs text-gray-500">Login Email</p>
                        <p className="font-bold text-indigo-900 text-sm mt-0.5 break-all">{login_email}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Password</p>
                        <p className="font-bold text-indigo-900 text-lg tracking-widest mt-0.5">{login_password}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                        Please save these credentials. The admin can retrieve them for you if needed.
                    </div>
                </div>

                <Link
                    href={route('databoy.login')}
                    className="block w-full py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl transition text-sm"
                >
                    Go to Login
                </Link>
            </div>
        </div>
    );
}
