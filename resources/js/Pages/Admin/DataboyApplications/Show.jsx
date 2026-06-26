import { Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

function Field({ label, value }) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-sm text-gray-800 font-medium">{value || '—'}</p>
        </div>
    );
}

export default function Show({ application }) {
    const availabilityLabel = {
        all_opportunities: 'Available for all opportunities',
        southwest_travel:  'Short-time contract (South West travel)',
        outside_state:     '30-day contract (outside state)',
        not_available:     'Not available',
    };

    return (
        <AdminLayout title={`Application — ${application.full_name}`}>
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Back link */}
                <Link href={route('admin.databoy-applications.index')}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Databoy Applications
                </Link>

                {/* Header card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {application.passport_photograph_path ? (
                        <img src={`/storage/${application.passport_photograph_path}`} alt={application.full_name}
                            className="w-20 h-20 rounded-2xl object-cover border-4 border-gray-100 shrink-0" />
                    ) : (
                        <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
                            <span className="text-indigo-600 text-2xl font-bold">{application.full_name?.charAt(0)}</span>
                        </div>
                    )}
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-800">{application.full_name}</h1>
                        <p className="text-sm text-gray-500">{application.email_address}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg">
                                {application.state_of_residence}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                                application.employment_status === 'Employed' ? 'bg-emerald-100 text-emerald-700'
                                : application.employment_status === 'Self-employed' ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>{application.employment_status}</span>
                            {application.has_voter_card && (
                                <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-lg">Has Voter Card</span>
                            )}
                        </div>
                    </div>
                    <div className="text-right text-xs text-gray-400 shrink-0">
                        <p>Application #{application.id}</p>
                        <p>{new Date(application.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                </div>

                {/* Registered By */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-indigo-500 uppercase tracking-wide">Registered By (Databoy)</p>
                        <p className="text-sm font-bold text-indigo-800">{application.databoy?.full_name ?? '—'}</p>
                        {application.databoy?.login_email && (
                            <p className="text-xs text-indigo-600">{application.databoy.login_email}</p>
                        )}
                    </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Personal */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Personal Information</h2>
                        <Field label="Full Name"          value={application.full_name} />
                        <Field label="Gender"             value={application.gender} />
                        <Field label="Age"                value={application.age} />
                        <Field label="Email Address"      value={application.email_address} />
                        <Field label="Phone Number"       value={application.calling_phone_number} />
                        <Field label="WhatsApp Number"    value={application.whatsapp_number} />
                        <Field label="State of Residence" value={application.state_of_residence} />
                        <Field label="House Address"      value={application.house_address} />
                    </div>

                    {/* Location */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Location</h2>
                        <Field label="LGA"          value={application.lga?.name} />
                        <Field label="Ward"         value={application.ward?.name} />
                        <Field label="Polling Unit" value={application.polling_unit?.name} />

                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-4">Network &amp; Bank</h2>
                        <Field label="Browsing Network" value={application.browsing_network} />
                        <Field label="Browsing Number"  value={application.browsing_number} />
                        <Field label="Bank Name"        value={application.bank_name} />
                        <Field label="Account Number"   value={application.account_number} />
                        <Field label="Account Name"     value={application.bank_account_name} />
                    </div>
                </div>

                {/* Professional */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Professional Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Field label="Employment Status"  value={application.employment_status} />
                        <Field label="Current Occupation" value={application.current_occupation} />
                        <Field label="Work Grade Level"   value={application.work_grade_level} />
                        <Field label="Availability"       value={availabilityLabel[application.availability] ?? application.availability} />
                    </div>
                </div>

                {/* Documents */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Uploaded Documents</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: 'Passport Photograph',        path: application.passport_photograph_path },
                            { label: 'Valid ID Card',              path: application.valid_id_card_path },
                            { label: 'Qualification Certificate',  path: application.highest_qualification_certificate_path },
                        ].map(({ label, path }) => (
                            <div key={label} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                                <p className="text-xs font-medium text-gray-500">{label}</p>
                                {path ? (
                                    <>
                                        {/\.(jpg|jpeg|png)$/i.test(path) && (
                                            <img src={`/storage/${path}`} alt={label}
                                                className="w-full h-32 object-cover rounded-lg border border-gray-100" />
                                        )}
                                        <a href={`/storage/${path}`} target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            View / Download
                                        </a>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-400">Not uploaded</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
}
