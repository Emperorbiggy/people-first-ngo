import { Link, usePage } from '@inertiajs/react';
import DataboyLayout from '@/Layouts/DataboyLayout';

export default function Dashboard({ total, recent, attendance = null }) {
    const { databoy } = usePage().props;

    return (
        <DataboyLayout title="Dashboard">
            {/* Welcome */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">
                    Welcome, {databoy?.full_name?.split(' ')[0]}!
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Assigned ward: <span className="font-medium text-indigo-700">{databoy?.ward?.name ?? '—'}</span>
                    {databoy?.lga?.name && <span className="text-gray-400">, {databoy.lga.name}</span>}
                </p>
            </div>

            {/* An accreditation boy's two jobs, front and centre */}
            {attendance && (
                <div className="mb-8">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Your Tasks Today</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link href={route('databoy.accreditation.index')}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4 hover:border-indigo-200 hover:shadow transition">
                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-gray-800">Accreditation</p>
                                <p className="text-sm text-gray-500">Check applicants in and out</p>
                            </div>
                        </Link>

                        <Link href={route('databoy.attendance.index')}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4 hover:border-emerald-200 hover:shadow transition">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-gray-800">Attendance</p>
                                <p className="text-sm text-gray-500">
                                    <span className="font-semibold text-emerald-700">{attendance.present}</span> of {attendance.total} marked present
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Applications Submitted</p>
                        <p className="text-3xl font-bold text-gray-800">{total}</p>
                    </div>
                </div>

                <Link
                    href={route('databoy.applications.create')}
                    className="bg-indigo-700 hover:bg-indigo-800 rounded-2xl p-6 flex items-center gap-4 group transition"
                >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-white font-bold">Add New Application</p>
                        <p className="text-indigo-200 text-sm">Register a constituent</p>
                    </div>
                </Link>
            </div>

            {/* Recent */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Recent Applications</h3>
                    <Link href={route('databoy.applications.index')} className="text-xs text-indigo-600 hover:underline">
                        View all →
                    </Link>
                </div>

                {recent.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-gray-400 text-sm">No applications yet.</p>
                        <Link
                            href={route('databoy.applications.create')}
                            className="inline-block mt-3 text-indigo-600 text-sm font-medium hover:underline"
                        >
                            Add your first application →
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {recent.map((app) => (
                            <div key={app.id} className="px-6 py-3.5 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{app.full_name}</p>
                                    <p className="text-xs text-gray-400">{app.state_of_residence}</p>
                                </div>
                                <p className="text-xs text-gray-400">
                                    {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DataboyLayout>
    );
}
