import { useMemo, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const STATUS_STYLES = {
    success: 'bg-green-50 border-green-200 text-green-700',
    failed:  'bg-red-50 border-red-200 text-red-700',
    null:    'bg-gray-50 border-gray-200 text-gray-500',
};

function StatusBadge({ status, message }) {
    const style = STATUS_STYLES[status ?? 'null'];
    const label = status === 'success' ? 'Recipient Created' : status === 'failed' ? 'Failed' : 'Not Created';
    return (
        <span title={message ?? undefined} className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${style}`}>
            {label}
        </span>
    );
}

function Stat({ label, value, tone = 'gray' }) {
    const tones = {
        gray:    'bg-gray-50 text-gray-800',
        green:   'bg-emerald-50 text-emerald-700',
        red:     'bg-red-50 text-red-700',
        amber:   'bg-amber-50 text-amber-700',
    };
    return (
        <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] font-semibold uppercase opacity-70 mt-0.5">{label}</p>
        </div>
    );
}

export default function ApoRecipients({ officers = [], stats }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return officers;
        return officers.filter((o) =>
            [o.full_name, o.calling_phone_number, o.bank_name, o.lga].some((v) => (v ?? '').toLowerCase().includes(q))
        );
    }, [officers, search]);

    const createAll = () => {
        setCreating(true);
        router.post(route('admin.apo-recipients.create'), {}, {
            preserveScroll: true,
            onFinish: () => setCreating(false),
        });
    };

    return (
        <AdminLayout title="APO Recipients">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">APO Recipients</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Transfer recipients for qualified APO officers. Create these before they are accredited so payment doesn't stall.
                        </p>
                    </div>
                    <Link href={route('admin.apo-payments')}
                        className="px-4 py-2 text-sm font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl transition whitespace-nowrap">
                        APO Payments →
                    </Link>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Stat label="APO Officers" value={stats.total} />
                    <Stat label="Ready to Pay" value={stats.ready} tone="green" />
                    <Stat label="Not Created" value={stats.pending} tone="amber" />
                    <Stat label="Failed" value={stats.failed} tone="red" />
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 flex gap-3 flex-wrap items-center border-b border-gray-50">
                        <input
                            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, phone, bank, LGA…"
                            className="flex-1 min-w-[200px] px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <button onClick={createAll} disabled={creating || stats.total === stats.ready}
                            className="px-4 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                            {creating ? 'Queueing…' : 'Create Missing Recipients'}
                        </button>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">
                            {officers.length === 0 ? 'No qualified APO officers with bank details yet.' : 'No results found.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['#', 'Name', 'Phone', 'LGA', 'Bank', 'Account', 'Status'].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((o, i) => (
                                        <tr key={o.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{o.full_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{o.calling_phone_number}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{o.lga}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{o.bank_name ?? '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{o.account_number ?? '—'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <StatusBadge status={o.recipient_status} message={o.recipient_message} />
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
