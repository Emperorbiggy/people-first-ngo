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
        <span
            title={message ?? undefined}
            className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${style}`}
        >
            {label}
        </span>
    );
}

export default function PartyAgentRecipients({ partyAgents = [] }) {
    const { flash, errors } = usePage().props;
    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);

    const filtered = useMemo(() => {
        if (!search.trim()) return partyAgents;
        const q = search.toLowerCase();
        return partyAgents.filter((agent) =>
            agent.full_name?.toLowerCase().includes(q) ||
            agent.calling_phone_number?.toLowerCase().includes(q) ||
            agent.bank_name?.toLowerCase().includes(q)
        );
    }, [partyAgents, search]);

    const pendingCount = partyAgents.filter((a) => a.recipient_status !== 'success').length;

    const createAll = () => {
        setCreating(true);
        router.post(route('admin.party-agent-recipients.create'), {}, {
            preserveScroll: true,
            onFinish: () => setCreating(false),
        });
    };

    return (
        <AdminLayout title="Party Agent Recipients">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Party Agent Recipients</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Create Paystack transfer recipients for party agents before paying them.</p>
                    </div>
                    <Link
                        href={route('admin.party-agent-payments')}
                        className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition whitespace-nowrap"
                    >
                        Go to Party Agent Payments
                    </Link>
                </div>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                        {flash.success}
                    </div>
                )}

                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                        {flash.error}
                    </div>
                )}

                {errors?.amount && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                        {errors.amount}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500">Pending recipient creation</p>
                        <p className="text-lg font-bold text-gray-800">{pendingCount} party agent{pendingCount !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                        type="button"
                        onClick={createAll}
                        disabled={creating || pendingCount === 0}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
                    >
                        {creating ? 'Queuing…' : `Create All Recipients (${pendingCount})`}
                    </button>
                </div>

                <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                    This queues a background job per party agent, paced to stay within Paystack's rate limit. Refresh this page after a minute or two to see updated statuses.
                </p>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Party Agents</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {partyAgents.length} record{partyAgents.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name, phone, or bank…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
                            />
                        </div>
                    </div>

                    {partyAgents.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-gray-400 text-sm">No party agents with bank details found.</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No party agents match that search.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Name', 'Bank Name', 'Account Number', 'Account Name', 'Recipient Status'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((agent) => (
                                        <tr key={agent.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{agent.full_name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{agent.bank_name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{agent.account_number}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{agent.bank_account_name}</td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <StatusBadge status={agent.recipient_status} message={agent.recipient_message} />
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
