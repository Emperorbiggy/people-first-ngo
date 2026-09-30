import { Link } from '@inertiajs/react';
import TransportAdminLayout from '@/Layouts/TransportAdminLayout';

function Stat({ label, value, sub, tone = 'bg-slate-100 text-slate-600' }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">{(value ?? 0).toLocaleString()}</p>
            {sub && <p className={`mt-1.5 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${tone}`}>{sub}</p>}
        </div>
    );
}

export default function Dashboard({ stats, byLga = [], topAgents = [], daily = [] }) {
    // Scaled against the busiest day so a quiet week still reads clearly.
    const peak = Math.max(1, ...daily.map((d) => d.count));
    const busiest = Math.max(1, ...byLga.map((l) => Number(l.vehicles)));

    return (
        <TransportAdminLayout title="Dashboard">
            <div className="max-w-7xl mx-auto space-y-5">

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Stat label="Vehicles captured" value={stats.vehicles}
                        sub={`${stats.today.toLocaleString()} today`} tone="bg-emerald-50 text-emerald-700" />
                    <Stat label="Transport agents" value={stats.agents}
                        sub={`${stats.agents_active.toLocaleString()} active`} tone="bg-blue-50 text-blue-700" />
                    <Stat label="Bike & Maruwa" value={stats.vehicles_bike}
                        sub={`${stats.agents_bike.toLocaleString()} agents`} tone="bg-violet-50 text-violet-700" />
                    <Stat label="Korope, Bus & Car" value={stats.vehicles_korope}
                        sub={`${stats.agents_korope.toLocaleString()} agents`} tone="bg-amber-50 text-amber-700" />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Stat label="This week" value={stats.this_week} />
                    <Stat label="Vehicle owners reached" value={stats.owners} />
                    <Stat label="Agents without a passport" value={stats.missing_passport}
                        sub={stats.missing_passport > 0 ? 'held at their profile' : 'all supplied'}
                        tone={stats.missing_passport > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'} />
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between">
                        <p className="text-xs font-medium text-gray-500">Downloads</p>
                        <div className="mt-2 flex flex-col gap-1.5">
                            <a href={route('transport-admin.exports.vehicles')}
                                className="text-xs font-semibold text-emerald-700 hover:underline">Vehicles (.xlsx) →</a>
                            <a href={route('transport-admin.exports.agents')}
                                className="text-xs font-semibold text-blue-700 hover:underline">Agents (.xlsx) →</a>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <h2 className="font-semibold text-gray-800 text-sm">Last 7 days</h2>
                        <div className="mt-4 flex items-end justify-between gap-2 h-32">
                            {daily.map((day) => (
                                <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                                    <span className="text-xs font-semibold text-gray-700 tabular-nums">{day.count}</span>
                                    <div className="w-full bg-gray-100 rounded-t-lg flex items-end h-full">
                                        <div className="w-full bg-slate-700 rounded-t-lg transition-all"
                                            style={{ height: `${(day.count / peak) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }} />
                                    </div>
                                    <span className="text-[11px] text-gray-400">{day.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-800 text-sm">Most active agents</h2>
                        </div>
                        {topAgents.length === 0 ? (
                            <p className="px-5 py-10 text-center text-sm text-gray-400">Nothing captured yet.</p>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {topAgents.map((a) => (
                                    <li key={a.id} className="px-5 py-3 flex items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <Link href={route('transport-admin.agents.show', a.id)}
                                                className="text-sm font-medium text-gray-800 hover:text-slate-900 hover:underline truncate block">
                                                {a.name}
                                            </Link>
                                            <p className="text-xs text-gray-400 truncate">{a.lga} · {a.stream}</p>
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 tabular-nums shrink-0">
                                            {a.vehicles.toLocaleString()}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800 text-sm">By local government</h2>
                    </div>
                    {byLga.length === 0 ? (
                        <p className="px-5 py-10 text-center text-sm text-gray-400">Nothing captured yet.</p>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {byLga.map((l) => (
                                <li key={l.lga_name} className="px-5 py-3">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="font-medium text-gray-700">{l.lga_name}</span>
                                        <span className="text-gray-500 tabular-nums shrink-0">
                                            {Number(l.vehicles).toLocaleString()} vehicles · {Number(l.agents)} agent{Number(l.agents) !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-slate-600 rounded-full"
                                            style={{ width: `${(Number(l.vehicles) / busiest) * 100}%` }} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

            </div>
        </TransportAdminLayout>
    );
}
