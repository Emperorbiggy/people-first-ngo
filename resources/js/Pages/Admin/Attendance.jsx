import { useMemo, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

function Stat({ label, value, tone = 'gray' }) {
    const tones = {
        gray:  'bg-gray-50 text-gray-800',
        green: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
    };
    return (
        <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] font-semibold uppercase opacity-70 mt-0.5">{label}</p>
        </div>
    );
}

export default function Attendance({ attendees = [], lgas = [], stats }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [lga, setLga] = useState('all');
    const [busyId, setBusyId] = useState(null);

    const filtered = useMemo(() => {
        // Every word typed must appear somewhere in the row, so "adeyemi b"
        // finds "Adeyemi Bolanle" — and so does "bolanle ade", since the words
        // are matched independently of the order they're written in.
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

        return attendees.filter((a) => {
            if (filter === 'present' && !a.present) return false;
            if (filter === 'absent' && a.present) return false;
            if (lga !== 'all' && a.lga !== lga) return false;
            if (terms.length === 0) return true;

            const haystack = [a.surname, a.firstname, a.othernames, a.phone_number, a.lga]
                .filter(Boolean).join(' ').toLowerCase();

            return terms.every((term) => haystack.includes(term));
        });
    }, [attendees, search, filter, lga]);

    const toggle = (attendee) => {
        setBusyId(attendee.id);
        router.post(route('admin.attendance.toggle', attendee.id), {}, {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    };

    const remove = (attendee) => {
        if (!confirm(`Remove ${attendee.full_name} from the attendance list?`)) return;
        router.delete(route('admin.attendance.destroy', attendee.id), { preserveScroll: true });
    };

    return (
        <AdminLayout title="Attendance">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Attendance</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Everyone on the list. Tap a name's button to mark them present.</p>
                    </div>
                    <Link href={route('admin.attendance.import')}
                        className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition whitespace-nowrap">
                        Import List
                    </Link>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}

                <div className="grid grid-cols-3 gap-3">
                    <Stat label="On List" value={stats.total} />
                    <Stat label="Present" value={stats.present} tone="green" />
                    <Stat label="Absent" value={stats.absent} tone="amber" />
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 flex gap-3 flex-wrap items-center border-b border-gray-50">
                        <input
                            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search surname, firstname, phone, LGA…"
                            className="flex-1 min-w-[200px] px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <select value={lga} onChange={(e) => setLga(e.target.value)}
                            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="all">All LGAs</option>
                            {lgas.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <div className="flex gap-1.5">
                            {['all', 'present', 'absent'].map((f) => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-3 py-2 text-xs font-semibold rounded-lg capitalize transition ${
                                        filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-sm text-gray-400">
                                {attendees.length === 0 ? 'No attendees yet.' : 'No results for this filter.'}
                            </p>
                            {attendees.length === 0 && (
                                <Link href={route('admin.attendance.import')} className="inline-block mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                                    Import an attendance list →
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['#', 'Surname', 'Firstname', 'Othernames', 'Phone', 'LGA', 'Status', 'Action', ''].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((a, i) => (
                                        <tr key={a.id} className={`transition ${a.present ? 'bg-emerald-50/40' : 'hover:bg-gray-50'}`}>
                                            <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap uppercase">{a.surname}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{a.firstname}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{a.othernames ?? '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{a.phone_number ?? '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{a.lga ?? '—'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {a.present ? (
                                                    <span className="inline-flex px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                                                        Present
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg">
                                                        Absent
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <button
                                                    onClick={() => toggle(a)}
                                                    disabled={busyId === a.id}
                                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition disabled:opacity-40 ${
                                                        a.present
                                                            ? 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                                                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    }`}
                                                >
                                                    {a.present ? 'Undo' : 'Mark Present'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <button onClick={() => remove(a)}
                                                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition">
                                                    Remove
                                                </button>
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
