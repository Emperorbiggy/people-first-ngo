import React from 'react';
import { Head, Link } from '@inertiajs/react';

const SHARE_URL = typeof window !== 'undefined' ? window.location.origin + '/ngo-contract-application' : '';
const SHARE_TEXT = 'Apply for the NGO Contract Work Programme — a great opportunity! Fill in your details here:';

function ShareTools() {
    const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

    const nativeShare = () => {
        navigator.share({ title: 'NGO Contract Work Programme', text: SHARE_TEXT, url: SHARE_URL }).catch(() => {});
    };

    const copyLink = () => {
        navigator.clipboard.writeText(SHARE_URL).then(() => alert('Link copied!')).catch(() => {});
    };

    const whatsapp = `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + ' ' + SHARE_URL)}`;
    const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`;
    const twitter  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`;

    return (
        <div className="bg-blue-50 rounded-2xl p-6">
            <p className="text-sm font-semibold text-blue-800 mb-4 text-center">Share this opportunity</p>
            <div className="flex flex-wrap justify-center gap-3">
                {/* WhatsApp */}
                <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                </a>

                {/* Facebook */}
                <a
                    href={facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                </a>

                {/* X / Twitter */}
                <a
                    href={twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    X (Twitter)
                </a>

                {/* Copy link / Native share */}
                {canNativeShare ? (
                    <button
                        onClick={nativeShare}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                        </svg>
                        Share
                    </button>
                ) : (
                    <button
                        onClick={copyLink}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold rounded-xl transition"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                        Copy Link
                    </button>
                )}
            </div>
        </div>
    );
}

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

                        {/* Congratulation heading */}
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

                        {/* Notice */}
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Do not submit more than one application and feel free to share this opportunity with your loved ones.
                        </p>

                        {/* Share tools */}
                        <ShareTools />

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                            <Link
                                href="/ngo-contract-application"
                                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
                            >
                                close
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}
