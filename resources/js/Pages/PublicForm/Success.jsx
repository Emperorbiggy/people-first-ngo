import { Head } from '@inertiajs/react';

export default function Success() {
    return (
        <>
            <Head title="Registration Successful" />
            <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Registration Successful</h1>
                        <p className="text-sm text-gray-500 mt-2">Your details have been submitted successfully.</p>
                    </div>
                </div>
            </div>
        </>
    );
}
