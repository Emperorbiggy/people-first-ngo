import { Link, usePage } from '@inertiajs/react';
import TransportAgentLayout from '@/Layouts/TransportAgentLayout';

const CATEGORY_LABEL = {
    bus: 'Buses & Cars',
    motorcycle_tricycle: 'Motorcycles & Tricycles',
};

function StatCard({ label, value, tone, icon }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>{icon}</div>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">{value.toLocaleString()}</p>
        </div>
    );
}

export default function Dashboard({ stats, recent, daily }) {
    const { transportAgentRegistrationEnabled: registrationEnabled = true } = usePage().props;

    // Scaled against the busiest day so a quiet week still reads clearly.
    const peak = Math.max(1, ...daily.map((d) => d.count));

    return (
        <TransportAgentLayout title="Dashboard">
            <div className="max-w-5xl mx-auto space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <StatCard
                        label="Total vehicles" value={stats.total} tone="bg-amber-50 text-amber-600"
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M8 17h8m-8 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m12 0a2 2 0 104 0m-4 0a2 2 0 114 0M3 6h13v11H3V6zm13 4h3.5L22 13v4h-6v-7z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Buses & cars" value={stats.bus} tone="bg-blue-50 text-blue-600"
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M4 16v2a1 1 0 001 1h1a1 1 0 001-1v-2m10 0v2a1 1 0 001 1h1a1 1 0 001-1v-2M5 16h14a1 1 0 001-1v-4l-2-5H6L4 10v5a1 1 0 001 1z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Motorcycles & tricycles" value={stats.motorcycle_tricycle} tone="bg-violet-50 text-violet-600"
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="6" cy="17" r="3" strokeWidth="2" />
                                <circle cx="18" cy="17" r="3" strokeWidth="2" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17h6l-3-7H8m6 0h3" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Today" value={stats.today} tone="bg-emerald-50 text-emerald-600"
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="This week" value={stats.this_week} tone="bg-orange-50 text-orange-600"
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Vehicle owners" value={stats.owners} tone="bg-rose-50 text-rose-600"
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M17 20h5v-1a3 3 0 00-3-3h-1m-4 4H2v-1a5 5 0 015-5h4a5 5 0 015 5v1zm-2-13a3 3 0 11-6 0 3 3 0 016 0zm7 1a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        }
                    />
                </div>

                {registrationEnabled ? (
                    <Link href={route('transport-agent.vehicles')}
                        className="flex items-center justify-between gap-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl px-5 py-4 shadow-sm transition">
                        <div>
                            <p className="font-semibold">Register a vehicle</p>
                            <p className="text-amber-100 text-xs mt-0.5">Capture the vehicle, the owner and both photos</p>
                        </div>
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                ) : (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M18.364 5.636L5.636 18.364M12 3a9 9 0 100 18 9 9 0 000-18z" />
                        </svg>
                        <div>
                            <p className="font-semibold text-sm">Registration is closed</p>
                            <p className="text-xs mt-0.5 text-red-600">
                                The administrator has paused vehicle registration. Your captured records are safe.
                            </p>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h2 className="font-semibold text-gray-800 text-sm">Last 7 days</h2>
                    <div className="mt-4 flex items-end justify-between gap-2 h-32">
                        {daily.map((day) => (
                            <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                                <span className="text-xs font-semibold text-gray-700 tabular-nums">{day.count}</span>
                                <div className="w-full bg-gray-100 rounded-t-lg flex items-end" style={{ height: '100%' }}>
                                    <div className="w-full bg-amber-500 rounded-t-lg transition-all"
                                        style={{ height: `${(day.count / peak) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }} />
                                </div>
                                <span className="text-[11px] text-gray-400">{day.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800 text-sm">Recent registrations</h2>
                        <Link href={route('transport-agent.vehicles')} className="text-xs font-medium text-amber-600 hover:text-amber-700">
                            View all
                        </Link>
                    </div>

                    {recent.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <p className="text-sm text-gray-500">You have not registered any vehicle yet.</p>
                            <Link href={route('transport-agent.vehicles')}
                                className="inline-block mt-3 text-sm font-medium text-amber-600 hover:text-amber-700">
                                Register your first vehicle
                            </Link>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {recent.map((vehicle) => (
                                <li key={vehicle.id} className="px-5 py-3.5 flex items-center gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-gray-800 text-sm tracking-wide">{vehicle.plate_number}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {vehicle.vehicle_type} · {vehicle.owner_name}
                                        </p>
                                    </div>
                                    <span className={`text-[11px] font-medium px-2 py-1 rounded-full shrink-0 ${
                                        vehicle.category === 'bus' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'
                                    }`}>
                                        {CATEGORY_LABEL[vehicle.category]}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </TransportAgentLayout>
    );
}
