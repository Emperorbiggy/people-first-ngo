import { useEffect, useRef, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import TransportAgentLayout from '@/Layouts/TransportAgentLayout';

const BLANK = {
    category: 'bus',
    vehicle_type: '',
    plate_number: '',
    make_model: '',
    colour: '',
    capacity: '',
    owner_name: '',
    owner_phone: '',
    owner_address: '',
    vehicle_photo: null,
    owner_photo: null,
};

function Field({ label, error, required, children, hint }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {hint && !error && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition';

/**
 * A photo slot. `capture="environment"` opens the rear camera on a phone but
 * still allows a gallery pick on a laptop, so the same control works in the
 * field and at a desk.
 */
function PhotoInput({ label, file, existing, error, onPick, onClear }) {
    const inputRef = useRef(null);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (!file) {
            setPreview(null);
            return;
        }

        const url = URL.createObjectURL(file);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    const shown = preview || existing;

    return (
        <Field label={label} error={error}>
            <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => onPick(e.target.files[0] || null)} />

            {shown ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    <img src={shown} alt={label} className="w-full h-36 object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex divide-x divide-white/20 bg-black/55 text-white text-xs">
                        <button type="button" onClick={() => inputRef.current?.click()} className="flex-1 py-2 hover:bg-black/30">
                            Retake
                        </button>
                        {file && (
                            <button type="button" onClick={onClear} className="flex-1 py-2 hover:bg-black/30">
                                Remove
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <button type="button" onClick={() => inputRef.current?.click()}
                    className="w-full h-36 rounded-xl border-2 border-dashed border-gray-200 hover:border-amber-400 hover:bg-amber-50/40 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-amber-600 transition">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs font-medium">Take photo</span>
                </button>
            )}
        </Field>
    );
}

function RegistrationClosedNotice() {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M18.364 5.636L5.636 18.364M12 3a9 9 0 100 18 9 9 0 000-18z" />
                    </svg>
                </div>
                <div>
                    <h2 className="font-semibold text-gray-800 text-sm">Registration is closed</h2>
                    <p className="text-xs text-gray-500 mt-1">
                        The administrator has paused vehicle registration. You cannot add or edit a
                        registration right now — everything you have already captured is safe and
                        listed below.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function Vehicles({ vehicles, filters, categories, types, counts, registrationEnabled = true }) {
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState(filters.q || '');
    const formRef = useRef(null);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({ ...BLANK });

    const typeOptions = types[data.category] || [];

    const startEdit = (vehicle) => {
        setEditing(vehicle);
        clearErrors();
        setData({
            category: vehicle.category,
            vehicle_type: vehicle.vehicle_type,
            plate_number: vehicle.plate_number,
            make_model: vehicle.make_model || '',
            colour: vehicle.colour || '',
            capacity: vehicle.capacity ?? '',
            owner_name: vehicle.owner_name,
            owner_phone: vehicle.owner_phone,
            owner_address: vehicle.owner_address || '',
            // Left null so an untouched photo is not re-uploaded on save.
            vehicle_photo: null,
            owner_photo: null,
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const cancelEdit = () => {
        setEditing(null);
        clearErrors();
        reset();
    };

    const submit = (e) => {
        e.preventDefault();

        const url = editing
            ? route('transport-agent.vehicles.update', editing.id)
            : route('transport-agent.vehicles.store');

        // Both go over POST: files cannot ride a real PUT, and the update route
        // is registered as POST for that reason.
        post(url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setEditing(null);
            },
        });
    };

    const applyFilters = (next) => {
        router.get(route('transport-agent.vehicles'), { q: search, category: filters.category, ...next }, {
            preserveState: true,
            replace: true,
        });
    };

    const tabs = [
        { key: 'all', label: 'All', count: counts.all },
        ...Object.entries(categories).map(([key, label]) => ({ key, label, count: counts[key] })),
    ];

    return (
        <TransportAgentLayout title="Register Vehicle">
            <div className="max-w-5xl mx-auto space-y-5">
                {!registrationEnabled && <RegistrationClosedNotice />}

                {registrationEnabled && (
                <form ref={formRef} onSubmit={submit}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className={`px-5 py-4 border-b ${editing ? 'bg-blue-50 border-blue-100' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="font-semibold text-gray-800 text-sm">
                                    {editing ? `Editing ${editing.plate_number}` : 'New vehicle registration'}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {editing
                                        ? 'Leave a photo untouched to keep the one already captured.'
                                        : 'Capture the vehicle, its owner, and a photo of each.'}
                                </p>
                            </div>
                            {editing && (
                                <button type="button" onClick={cancelEdit}
                                    className="text-xs font-medium text-gray-500 hover:text-gray-700 shrink-0">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-5 space-y-5">
                        <Field label="Category" required error={errors.category}>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(categories).map(([key, label]) => (
                                    <button key={key} type="button"
                                        onClick={() => setData((prev) => ({ ...prev, category: key, vehicle_type: '' }))}
                                        className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition ${
                                            data.category === key
                                                ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
                                        }`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </Field>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Vehicle type" required error={errors.vehicle_type}>
                                <select value={data.vehicle_type} onChange={(e) => setData('vehicle_type', e.target.value)}
                                    className={inputClass}>
                                    <option value="">Select type</option>
                                    {typeOptions.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Plate number" required error={errors.plate_number} hint="Spaces and dashes are ignored">
                                <input type="text" value={data.plate_number}
                                    onChange={(e) => setData('plate_number', e.target.value.toUpperCase())}
                                    placeholder="ABC123XY" className={`${inputClass} tracking-wider font-medium`} />
                            </Field>

                            <Field label="Make & model" error={errors.make_model}>
                                <input type="text" value={data.make_model} onChange={(e) => setData('make_model', e.target.value)}
                                    placeholder="Toyota Hiace" className={inputClass} />
                            </Field>

                            <Field label="Colour" error={errors.colour}>
                                <input type="text" value={data.colour} onChange={(e) => setData('colour', e.target.value)}
                                    placeholder="White" className={inputClass} />
                            </Field>

                            <Field label="Passenger capacity" error={errors.capacity}>
                                <input type="number" min="1" max="200" value={data.capacity}
                                    onChange={(e) => setData('capacity', e.target.value)} placeholder="14" className={inputClass} />
                            </Field>
                        </div>

                        <div className="pt-1 border-t border-gray-50">
                            <p className="text-xs font-semibold text-gray-700 pt-4 mb-3">Vehicle owner</p>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Owner's full name" required error={errors.owner_name}>
                                    <input type="text" value={data.owner_name} onChange={(e) => setData('owner_name', e.target.value)}
                                        className={inputClass} />
                                </Field>

                                <Field label="Owner's phone number" required error={errors.owner_phone}>
                                    <input type="tel" inputMode="numeric" maxLength={11} value={data.owner_phone}
                                        onChange={(e) => setData('owner_phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                                        placeholder="08012345678" className={`${inputClass} tabular-nums`} />
                                </Field>

                                <div className="sm:col-span-2">
                                    <Field label="Owner's address" error={errors.owner_address}>
                                        <input type="text" value={data.owner_address}
                                            onChange={(e) => setData('owner_address', e.target.value)} className={inputClass} />
                                    </Field>
                                </div>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4 pt-1 border-t border-gray-50">
                            <div className="sm:col-span-2 pt-4 -mb-1">
                                <p className="text-xs font-semibold text-gray-700">Photos</p>
                            </div>
                            <PhotoInput label="Photo of vehicle" file={data.vehicle_photo} error={errors.vehicle_photo}
                                existing={editing?.vehicle_photo_url}
                                onPick={(file) => setData('vehicle_photo', file)}
                                onClear={() => setData('vehicle_photo', null)} />
                            <PhotoInput label="Photo of owner" file={data.owner_photo} error={errors.owner_photo}
                                existing={editing?.owner_photo_url}
                                onPick={(file) => setData('owner_photo', file)}
                                onClear={() => setData('owner_photo', null)} />
                        </div>

                        <button type="submit" disabled={processing}
                            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition">
                            {processing ? 'Saving…' : editing ? 'Save changes' : 'Register vehicle'}
                        </button>
                    </div>
                </form>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 space-y-3">
                        <h2 className="font-semibold text-gray-800 text-sm">My registrations</h2>

                        <div className="flex flex-wrap gap-2">
                            {tabs.map((tab) => (
                                <button key={tab.key} onClick={() => applyFilters({ category: tab.key })}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                                        filters.category === tab.key
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {tab.label} <span className="tabular-nums opacity-80">({tab.count})</span>
                                </button>
                            ))}
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); applyFilters({}); }} className="flex gap-2">
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search plate, owner, phone or model" className={inputClass} />
                            <button type="submit"
                                className="px-4 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium shrink-0">
                                Search
                            </button>
                        </form>
                    </div>

                    {vehicles.data.length === 0 ? (
                        <p className="px-5 py-10 text-center text-sm text-gray-500">
                            {filters.q ? 'Nothing matches that search.' : 'No vehicle registered yet.'}
                        </p>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {vehicles.data.map((vehicle) => (
                                <li key={vehicle.id} className="px-5 py-4 flex items-center gap-3">
                                    {vehicle.vehicle_photo_url ? (
                                        <img src={vehicle.vehicle_photo_url} alt=""
                                            className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                    d="M8 17h8m-8 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m12 0a2 2 0 104 0m-4 0a2 2 0 114 0M3 6h13v11H3V6zm13 4h3.5L22 13v4h-6v-7z" />
                                            </svg>
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-gray-800 text-sm tracking-wide">{vehicle.plate_number}</p>
                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                                vehicle.category === 'bus' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'
                                            }`}>
                                                {vehicle.vehicle_type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            {vehicle.owner_name} · {vehicle.owner_phone}
                                        </p>
                                    </div>

                                    {registrationEnabled && (
                                        <button onClick={() => startEdit(vehicle)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 shrink-0 transition">
                                            Edit
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {vehicles.last_page > 1 && (
                        <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap gap-1.5 justify-center">
                            {vehicles.links.map((link, index) => (
                                <Link key={index} href={link.url || '#'} preserveScroll
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                        link.active ? 'bg-amber-600 text-white'
                                            : link.url ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                : 'bg-gray-50 text-gray-300 pointer-events-none'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </TransportAgentLayout>
    );
}
