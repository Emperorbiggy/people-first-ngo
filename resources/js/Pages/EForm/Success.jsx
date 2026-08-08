import { Head, Link } from '@inertiajs/react';

export default function Success() {
    return (
        <>
            <Head title="E-Form Submitted" />

            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-900 flex items-center justify-center p-4">
                <div className="relative z-10 w-full max-w-md text-center">
                    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-5">
                            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h1 className="text-2xl font-bold text-gray-800">Submission Received</h1>
                        <p className="text-sm text-gray-500 mt-2">
                            Your e-form has been recorded. Keep your Application ID safe — you'll need it if anything has to be corrected.
                        </p>

                        <Link
                            href={route('e-form.create')}
                            className="inline-block mt-6 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                            Submit another e-form →
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
