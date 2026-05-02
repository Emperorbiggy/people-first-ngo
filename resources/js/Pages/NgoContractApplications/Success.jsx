import React from 'react';
import { Head, Link } from '@inertiajs/react';

export default function Success() {
    return (
        <>
            <Head title="Application Submitted Successfully" />
            
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center">
                        {/* Success Icon */}
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
                            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>

                        {/* Success Message */}
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
                            Application Submitted Successfully!
                        </h1>
                        
                        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                            Thank you for your interest in the NGO Contract Work Program. Your application has been received and is currently under review.
                        </p>


                        {/* Contact Information */}
                        <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">Need to Contact Us?</h3>
                            <div className="space-y-2 text-gray-600">
                                <p className="flex items-center justify-center">
                                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                    </svg>
                                    applications@ngo-contract.org
                                </p>
                                <p className="flex items-center justify-center">
                                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                    </svg>
                                    +234 800 123 4567
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/ngo-contract-application"
                                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
                            >
                                Submit Another Application
                            </Link>
                            <Link
                                href="/"
                                className="px-8 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-colors duration-200"
                            >
                                Return to Homepage
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}
