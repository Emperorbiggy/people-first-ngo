import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

function SettingRow({ label, description, enabled, settingKey, statusOn, statusOff, colorOn = 'green', colorOff = 'red' }) {
    const [value, setValue] = useState(enabled);

    const toggle = (next) => {
        setValue(next);
        router.post(route('admin.settings.update'), { key: settingKey, value: next }, { preserveScroll: true });
    };

    const colors = {
        green: 'bg-green-50 border-green-200 text-green-700',
        red:   'bg-red-50 border-red-200 text-red-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                    <p className="font-semibold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
                <button
                    type="button"
                    onClick={() => toggle(!value)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        value ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        value ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                </button>
            </div>
            <div className={`rounded-xl px-4 py-2.5 text-sm font-medium border ${value ? colors[colorOn] : colors[colorOff]}`}>
                {value ? statusOn : statusOff}
            </div>
        </div>
    );
}

export default function Settings({ registrationOpen, accessEnabled }) {
    const { flash } = usePage().props;

    return (
        <AdminLayout title="Settings">
            <div className="max-w-xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-bold text-gray-800">Settings</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Control databoy registration and application access.</p>
                </div>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                        {flash.success}
                    </div>
                )}

                <SettingRow
                    label="Databoy Registration"
                    description="Controls whether the public /databoy/register page accepts new registrations."
                    settingKey="databoy_registration_open"
                    enabled={registrationOpen}
                    statusOn="Registration is OPEN — databoys can register."
                    statusOff="Registration is CLOSED — the form shows a closed message."
                    colorOn="green"
                    colorOff="red"
                />

                <SettingRow
                    label="Databoy Account Access"
                    description="When disabled, no databoy can open the application creation form, regardless of their individual account."
                    settingKey="databoy_access_enabled"
                    enabled={accessEnabled}
                    statusOn="Access is ENABLED — databoys can create applications."
                    statusOff="Access is DISABLED — all databoys are blocked from creating applications."
                    colorOn="green"
                    colorOff="red"
                />

            </div>
        </AdminLayout>
    );
}
