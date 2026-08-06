import { Link, router, usePage } from '@inertiajs/react';

/**
 * The APO accreditation officer's whole navigation. They're confined to two
 * routes server-side, so this is a two-tab header rather than the full databoy
 * menu — both of their jobs, always one tap away.
 */
export default function ApoOfficerHeader({ active }) {
    const { databoy } = usePage().props;

    const tab = (key, href, label) => {
        const isActive = active === key;
        return (
            <Link
                href={route(href)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    isActive ? 'bg-white text-violet-700' : 'text-violet-100 hover:bg-violet-600/70'
                }`}
            >
                {label}
            </Link>
        );
    };

    return (
        <header className="bg-violet-700 text-white">
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="font-bold text-lg leading-tight">
                        {active === 'attendance' ? 'Attendance' : 'APO Accreditation'}
                    </h1>
                    <p className="text-violet-200 text-xs mt-0.5 truncate">{databoy?.full_name}</p>
                </div>

                <button
                    onClick={() => router.post(route('databoy.logout'))}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-500 rounded-lg transition"
                >
                    Log out
                </button>
            </div>

            <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-1.5">
                {tab('accreditation', 'databoy.apo-accreditation.index', 'APO Accreditation')}
                {tab('attendance', 'databoy.attendance.index', 'Attendance')}
            </div>
        </header>
    );
}
