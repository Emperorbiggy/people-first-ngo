import React from 'react';
import { Head } from '@inertiajs/react';

export default function Success() {
    return (
        <>
            <Head title="Application Submitted Successfully" />

            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center space-y-6">

                        {/* Success icon */}
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        {/* Heading */}
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-3">
                                Application Submitted Successfully!
                            </h1>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                Thank you for your interest in the NGO Contract Work Programme. Your application has been received and is currently under review.
                            </p>
                        </div>

                        {/* Representative notice */}
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                            <p className="text-green-800 font-semibold text-base">
                                A Representative will contact you shortly.
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}
