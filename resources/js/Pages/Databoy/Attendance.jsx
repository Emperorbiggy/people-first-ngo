import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import DataboyLayout from '@/Layouts/DataboyLayout';
import ApoOfficerHeader from '@/Components/ApoOfficerHeader';

export default function Attendance({ attendees = [], lgas = [], stats }) {
    const { flash, databoy } = usePage().props;

    // An APO officer has no databoy dashboard to go back to, so they keep
    // their own two-tab header here instead of the full databoy layout.
    const isApoOfficer = databoy?.role === 'apo_accreditation_officer';
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [lga, setLga] = useState('all');
    const [busyId, setBusyId] = useState(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return attendees.filter((a) => {
            if (filter === 'present' && !a.present) return false;
            if (filter === 'absent' && a.present) return false;
            if (lga !== 'all' && a.lga !== lga) return false;
            if (!q) return true;
            return [a.surname, a.firstname, a.othernames, a.phone_number, a.lga].some((v) => (v ?? '').toLowerCase().includes(q));
        });
    }, [attendees, search, filter, lga]);

    const toggle = (attendee) => {
        setBusyId(attendee.id);
        router.post(route('databoy.attendance.toggle', attendee.id), {}, {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    };

    const body = (
        <>
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Attendance</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Mark each person present as they arrive.</p>
                </div>

                {flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>
                )}

                <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                        <p className="text-[11px] font-semibold uppercase text-gray-400 mt-0.5">On List</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-emerald-700">{stats.present}</p>
                        <p className="text-[11px] font-semibold uppercase text-emerald-600/70 mt-0.5">Present</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-amber-700">{stats.absent}</p>
                        <p className="text-[11px] font-semibold uppercase text-amber-600/70 mt-0.5">Absent</p>
                    </div>
                </div>

                <div className="space-y-2.5">
                    <input
                        type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name or phone…"
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <div className="flex gap-2">
                        <select value={lga} onChange={(e) => setLga(e.target.value)}
                            className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="all">All LGAs</option>
                            {lgas.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <div className="flex gap-1.5 shrink-0">
                            {['all', 'present', 'absent'].map((f) => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-3 py-2.5 text-xs font-semibold rounded-xl capitalize transition ${
                                        filter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
                                    }`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-sm text-gray-400">
                        {attendees.length === 0 ? 'No attendance list has been uploaded yet.' : 'No one matches this filter.'}
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {filtered.map((a) => (
                            <div key={a.id}
                                className={`rounded-2xl border p-4 flex items-center gap-3 transition ${
                                    a.present ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'
                                }`}>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-gray-800 truncate">
                                        <span className="uppercase">{a.surname}</span> {a.firstname}
                                    </p>
                                    {a.othernames && (
                                        <p className="text-xs text-gray-400 truncate">{a.othernames}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                                        {a.phone_number}{a.lga ? ` · ${a.lga}` : ''}
                                    </p>
                                </div>

                                <button
                                    onClick={() => toggle(a)}
                                    disabled={busyId === a.id}
                                    className={`shrink-0 px-4 py-2.5 text-xs font-bold rounded-xl transition disabled:opacity-40 ${
                                        a.present
                                            ? 'bg-white border border-emerald-300 text-emerald-700'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    }`}
                                >
                                    {a.present ? '✓ Present' : 'Mark Present'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );

    if (isApoOfficer) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Head title="Attendance" />
                <ApoOfficerHeader active="attendance" />
                {body}
            </div>
        );
    }

    return <DataboyLayout title="Attendance">{body}</DataboyLayout>;
}
