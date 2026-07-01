import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';

function DownloadCard({ icon, iconBg, iconColor, title, description, note, count, buttonLabel, buttonColor, href }) {
    const [loading, setLoading] = useState(false);

    const handleDownload = () => {
        setLoading(true);
        const a = document.createElement('a');
        a.href = href;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => setLoading(false), 4000);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center shrink-0`}>
                    <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {icon}
                    </svg>
                </div>
                <div className="flex-1">
                    <p className="font-bold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 font-medium">Files available</span>
                <span className="text-lg font-bold text-gray-800">{count.toLocaleString()}</span>
            </div>

            {note && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-amber-700">{note}</p>
                </div>
            )}

            <button
                type="button"
                onClick={handleDownload}
                disabled={loading || count === 0}
                className={`w-full py-3 ${buttonColor} disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2`}
            >
                {loading ? (
                    <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Preparing download…
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {buttonLabel}
                    </>
                )}
            </button>

            {count === 0 && (
                <p className="text-center text-xs text-gray-400">No files available yet.</p>
            )}
        </div>
    );
}

const ICONS = {
    passport: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
    idCard: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
    ),
    certificate: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
};

const PDF_NOTE = 'Images are converted to PDF. Run Image Compression from Settings first to reduce file sizes.';

function SectionHeading({ label, subtitle }) {
    return (
        <div className="border-b border-gray-200 pb-3">
            <h2 className="text-base font-bold text-gray-800">{label}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
    );
}

export default function NgoDownloads({ ngo, databoy, databoyApp }) {
    return (
        <AdminLayout title="Downloads">
            <div className="max-w-5xl mx-auto space-y-8">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Bulk Downloads</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Download documents from NGO applications, databoy registrations, and databoy applications as ZIP archives.</p>
                </div>

                {/* NGO Applications */}
                <div className="space-y-4">
                    <SectionHeading
                        label="NGO Contract Applications"
                        subtitle="Documents submitted during NGO contract application."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <DownloadCard
                            title="Passport Photographs"
                            description="All passport photographs from NGO contract applications."
                            note={null}
                            count={ngo.passports}
                            buttonLabel="Download ZIP"
                            buttonColor="bg-indigo-600 hover:bg-indigo-700"
                            href={route('admin.ngo-downloads.passports')}
                            iconBg="bg-indigo-100" iconColor="text-indigo-600"
                            icon={ICONS.passport}
                        />
                        <DownloadCard
                            title="Valid ID Cards"
                            description="All ID cards from NGO contract applications."
                            note={PDF_NOTE}
                            count={ngo.idCards}
                            buttonLabel="Download as PDF ZIP"
                            buttonColor="bg-emerald-600 hover:bg-emerald-700"
                            href={route('admin.ngo-downloads.id-cards')}
                            iconBg="bg-emerald-100" iconColor="text-emerald-600"
                            icon={ICONS.idCard}
                        />
                        <DownloadCard
                            title="Qualification Certificates"
                            description="All certificates from NGO contract applications."
                            note={PDF_NOTE}
                            count={ngo.certificates}
                            buttonLabel="Download as PDF ZIP"
                            buttonColor="bg-violet-600 hover:bg-violet-700"
                            href={route('admin.ngo-downloads.certificates')}
                            iconBg="bg-violet-100" iconColor="text-violet-600"
                            icon={ICONS.certificate}
                        />
                    </div>
                </div>

                {/* Databoy Registrations */}
                <div className="space-y-4">
                    <SectionHeading
                        label="Databoy Registrations"
                        subtitle="Documents submitted during databoy registration."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <DownloadCard
                            title="Passport Photographs"
                            description="All passport photographs from databoy registrations."
                            note={null}
                            count={databoy.passports}
                            buttonLabel="Download ZIP"
                            buttonColor="bg-indigo-600 hover:bg-indigo-700"
                            href={route('admin.ngo-downloads.databoy-passports')}
                            iconBg="bg-indigo-100" iconColor="text-indigo-600"
                            icon={ICONS.passport}
                        />
                        <DownloadCard
                            title="Valid ID Cards"
                            description="All ID cards from databoy registrations."
                            note={PDF_NOTE}
                            count={databoy.idCards}
                            buttonLabel="Download as PDF ZIP"
                            buttonColor="bg-emerald-600 hover:bg-emerald-700"
                            href={route('admin.ngo-downloads.databoy-id-cards')}
                            iconBg="bg-emerald-100" iconColor="text-emerald-600"
                            icon={ICONS.idCard}
                        />
                        <DownloadCard
                            title="Qualification Certificates"
                            description="All certificates from databoy registrations."
                            note={PDF_NOTE}
                            count={databoy.certificates}
                            buttonLabel="Download as PDF ZIP"
                            buttonColor="bg-violet-600 hover:bg-violet-700"
                            href={route('admin.ngo-downloads.databoy-certificates')}
                            iconBg="bg-violet-100" iconColor="text-violet-600"
                            icon={ICONS.certificate}
                        />
                    </div>
                </div>

                {/* Databoy Applications */}
                <div className="space-y-4">
                    <SectionHeading
                        label="Databoy Applications"
                        subtitle="Documents submitted when databoys created their applications."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <DownloadCard
                            title="Passport Photographs"
                            description="All passport photographs from databoy applications."
                            note={null}
                            count={databoyApp.passports}
                            buttonLabel="Download ZIP"
                            buttonColor="bg-indigo-600 hover:bg-indigo-700"
                            href={route('admin.ngo-downloads.databoy-app-passports')}
                            iconBg="bg-indigo-100" iconColor="text-indigo-600"
                            icon={ICONS.passport}
                        />
                        <DownloadCard
                            title="Valid ID Cards"
                            description="All ID cards from databoy applications."
                            note={PDF_NOTE}
                            count={databoyApp.idCards}
                            buttonLabel="Download as PDF ZIP"
                            buttonColor="bg-emerald-600 hover:bg-emerald-700"
                            href={route('admin.ngo-downloads.databoy-app-id-cards')}
                            iconBg="bg-emerald-100" iconColor="text-emerald-600"
                            icon={ICONS.idCard}
                        />
                        <DownloadCard
                            title="Qualification Certificates"
                            description="All certificates from databoy applications."
                            note={PDF_NOTE}
                            count={databoyApp.certificates}
                            buttonLabel="Download as PDF ZIP"
                            buttonColor="bg-violet-600 hover:bg-violet-700"
                            href={route('admin.ngo-downloads.databoy-app-certificates')}
                            iconBg="bg-violet-100" iconColor="text-violet-600"
                            icon={ICONS.certificate}
                        />
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 text-sm text-blue-700 space-y-1">
                    <p className="font-semibold">How it works</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs text-blue-600">
                        <li>Each download packages all available files into a single ZIP archive.</li>
                        <li>For ID cards and certificates, JPG/PNG/JPEG files are converted to PDF on the fly.</li>
                        <li>Files that are already PDFs are included as-is.</li>
                        <li><strong>To reduce ZIP size:</strong> go to Settings → Compress Images first, then download.</li>
                        <li>Large collections may take a moment — please wait for the download to start.</li>
                    </ul>
                </div>

            </div>
        </AdminLayout>
    );
}
