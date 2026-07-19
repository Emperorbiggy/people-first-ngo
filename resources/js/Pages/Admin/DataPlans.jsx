import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/Layouts/AdminLayout';

function formatNaira(value) {
    const n = Number(value);
    if (!n) return '₦0';
    return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PlanPickerModal({ network, onClose }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [plans, setPlans] = useState([]);
    const [selected, setSelected] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        axios.get(route('admin.data-plans.products', network.id))
            .then(({ data }) => {
                if (data.status) {
                    setPlans(data.plans ?? []);
                } else {
                    setError('Could not load plans for this network.');
                }
            })
            .catch(() => setError('Could not load plans for this network.'))
            .finally(() => setLoading(false));
    }, []);

    const save = () => {
        if (!selected) return;
        setSaving(true);
        router.post(route('admin.data-plans.save'), {
            network: network.name,
            service_category_id: network.id,
            bundle_code: selected.bundleCode,
            amount: selected.amount,
            validity: selected.validity,
        }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setSaving(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-800">Select Plan — {network.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Choose the data bundle to use whenever databoys on this network get topped up.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-2">
                    {loading && (
                        <div className="py-10 text-center text-sm text-gray-400">Loading plans…</div>
                    )}
                    {!loading && error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
                    )}
                    {!loading && !error && plans.length === 0 && (
                        <div className="py-10 text-center text-sm text-gray-400">No plans available for this network.</div>
                    )}
                    {!loading && !error && plans.map((plan) => (
                        <button
                            key={plan.bundleCode}
                            type="button"
                            onClick={() => setSelected(plan)}
                            className={`w-full text-left px-4 py-3 border rounded-xl transition flex items-center justify-between gap-3 ${
                                selected?.bundleCode === plan.bundleCode
                                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <span className="text-sm text-gray-700">{plan.validity}</span>
                            <span className="text-sm font-bold text-gray-800 whitespace-nowrap">{formatNaira(plan.amount)}</span>
                        </button>
                    ))}
                </div>

                <div className="p-5 border-t border-gray-100 shrink-0">
                    <button
                        type="button"
                        onClick={save}
                        disabled={!selected || saving}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
                    >
                        {saving ? 'Saving…' : selected ? `Save ${formatNaira(selected.amount)} Plan` : 'Select a plan above'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DataPlans({ networks = [], fetchFailed = false }) {
    const { flash } = usePage().props;
    const [configuring, setConfiguring] = useState(null);

    return (
        <AdminLayout title="Data Plans">
            {configuring && (
                <PlanPickerModal network={configuring} onClose={() => setConfiguring(null)} />
            )}

            <div className="max-w-4xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Data Plans</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Set the data bundle purchased for databoys on each network, via EasiGateway.</p>
                </div>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                        {flash.success}
                    </div>
                )}

                {fetchFailed && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                        Could not fetch networks from EasiGateway right now. Check the API key/URL in your environment, then reload this page.
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {networks.map((network) => (
                        <div key={network.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                {network.logo_url ? (
                                    <img src={network.logo_url} alt={network.name} className="w-10 h-10 rounded-xl object-contain border border-gray-100 bg-white shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                                        <span className="text-indigo-600 text-sm font-bold">{network.name?.charAt(0)}</span>
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-gray-800">{network.name}</p>
                                    <p className="text-xs text-gray-400">{network.identifier}</p>
                                </div>
                            </div>

                            {network.plan ? (
                                <div className="bg-gray-50 rounded-xl px-4 py-3">
                                    <p className="text-xs text-gray-500">Current plan</p>
                                    <p className="text-sm text-gray-700 mt-0.5">{network.plan.validity}</p>
                                    <p className="text-sm font-bold text-indigo-600 mt-1">{formatNaira(network.plan.amount)}</p>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                                    No plan configured yet.
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setConfiguring(network)}
                                className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-sm transition"
                            >
                                {network.plan ? 'Change Plan' : 'Select Plan'}
                            </button>
                        </div>
                    ))}
                </div>

                {networks.length === 0 && !fetchFailed && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center text-sm text-gray-400">
                        No networks returned by EasiGateway.
                    </div>
                )}

            </div>
        </AdminLayout>
    );
}
