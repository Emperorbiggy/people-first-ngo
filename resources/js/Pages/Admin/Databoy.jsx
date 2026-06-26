import AdminLayout from '@/Layouts/AdminLayout';

function StatCard({ label, value, icon, color }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
}

export default function DataboyAdmin({ stats = {}, lgaCoverage = [], databoys = [] }) {
    return (
        <AdminLayout title="Databoy Overview">
            <div className="max-w-7xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Databoy Overview</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Ward coverage and registered databoy agents.</p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                        label="Registered Databoys"
                        value={stats.total ?? 0}
                        color="bg-indigo-100"
                        icon={
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="LGAs with Databoy"
                        value={stats.lgas ?? 0}
                        color="bg-violet-100"
                        icon={
                            <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Wards with Databoy"
                        value={stats.wards ?? 0}
                        color="bg-teal-100"
                        icon={
                            <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                        }
                    />
                </div>

                {/* LGA Ward Coverage Chart */}
                {lgaCoverage.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-semibold text-gray-800 mb-1">Ward Coverage by LGA</h3>
                        <p className="text-xs text-gray-400 mb-5 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500"></span> Registered
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block w-3 h-3 rounded-sm bg-gray-200"></span> Pending
                            </span>
                        </p>
                        <div className="space-y-4">
                            {lgaCoverage.map((lga) => {
                                const total      = lga.wards_count ?? 0;
                                const registered = lga.registered_count ?? 0;
                                const pending    = total - registered;
                                const pct        = total > 0 ? Math.round((registered / total) * 100) : 0;
                                return (
                                    <div key={lga.id}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-medium text-gray-700">{lga.name}</span>
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className="text-indigo-600 font-medium">{registered} registered</span>
                                                <span className="text-gray-400">{pending} pending</span>
                                                <span className={`font-bold ${pct === 100 ? 'text-green-600' : pct > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                    {pct}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                                            {registered > 0 && (
                                                <div className="bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                                            )}
                                            {pending > 0 && (
                                                <div className="bg-gray-200" style={{ width: `${100 - pct}%` }} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
                        No geo data imported yet. Import geographic data first to see ward coverage.
                    </div>
                )}

                {/* Registered Databoys List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">Registered Databoys</h3>
                        <span className="text-sm text-gray-400">{databoys.length} agent{databoys.length !== 1 ? 's' : ''}</span>
                    </div>

                    {databoys.length === 0 ? (
                        <div className="py-16 text-center">
                            <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-gray-400 text-sm">No databoys registered yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['#', 'Name', 'Login Email', 'Phone', 'LGA', 'Ward', 'Registered'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {databoys.map((db, idx) => (
                                        <tr key={db.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-xs text-gray-400">{idx + 1}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                        <span className="text-indigo-700 text-xs font-bold">{db.full_name?.charAt(0)}</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{db.full_name}</p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{db.login_email}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{db.calling_phone_number}</td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-lg whitespace-nowrap">
                                                    {db.lga?.name ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{db.ward?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(db.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </AdminLayout>
    );
}
