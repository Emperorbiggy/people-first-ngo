import { useEffect, useRef, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import PaystackService from '@/services/paystack';

/**
 * A photo slot with both routes in: `capture` opens the camera straight away on
 * a phone, the plain input picks an existing file. Two inputs rather than one,
 * because a single `capture` input gives a laptop no way to browse.
 */
function PhotoField({ label, hint, required, file, error, onPick, onClear, camera = 'environment', tall = false }) {
    const cameraRef = useRef(null);
    const uploadRef = useRef(null);
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

    const pick = (e) => onPick(e.target.files[0] || null);

    return (
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>

            <input ref={cameraRef} type="file" accept="image/*" capture={camera} className="hidden" onChange={pick} />
            <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={pick} />

            {preview ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200">
                    <img src={preview} alt={label} className={`w-full object-cover ${tall ? 'h-56' : 'h-44'}`} />
                    <div className="absolute inset-x-0 bottom-0 flex divide-x divide-white/20 bg-black/60 text-white text-xs font-medium">
                        <button type="button" onClick={() => cameraRef.current?.click()} className="flex-1 py-2.5 hover:bg-black/30">
                            Retake
                        </button>
                        <button type="button" onClick={() => uploadRef.current?.click()} className="flex-1 py-2.5 hover:bg-black/30">
                            Change file
                        </button>
                        <button type="button" onClick={onClear} className="flex-1 py-2.5 hover:bg-black/30">
                            Remove
                        </button>
                    </div>
                </div>
            ) : (
                <div className={`rounded-2xl border-2 border-dashed ${error ? 'border-red-300 bg-red-50/40' : 'border-gray-200'} p-4`}>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => cameraRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"
                                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-xs font-bold">Take photo</span>
                        </button>

                        <button type="button" onClick={() => uploadRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"
                                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12l-4 4m4-4l4 4" />
                            </svg>
                            <span className="text-xs font-bold">Upload</span>
                        </button>
                    </div>
                    {hint && <p className="mt-3 text-center text-xs text-gray-400">{hint}</p>}
                </div>
            )}

            {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </div>
    );
}

export default function Create({ lgas = [], idTypes = {} }) {
    const { data, setData, post, processing, errors } = useForm({
        full_name: '',
        phone_number: '',
        whatsapp_number: '',
        email: '',
        gender: '',
        address: '',
        lga_id: '',
        passport_photograph: null,
        id_type: '',
        id_number: '',
        id_document: null,
        account_number: '',
        bank_name: '',
        bank_code: '',
    });

    const [banks, setBanks] = useState([]);
    const [resolving, setResolving] = useState(false);
    const [accountName, setAccountName] = useState('');
    const [resolveError, setResolveError] = useState('');

    useEffect(() => {
        PaystackService.fetchBanks()
            .then((list) => setBanks(Array.isArray(list) ? list : []))
            .catch(() => {});
    }, []);

    /** Ask the bank whose account this is, as soon as both parts are known. */
    const verify = async (accountNumber, bankCode) => {
        if (accountNumber.length !== 10 || !bankCode) return;

        setResolving(true);
        setAccountName('');
        setResolveError('');

        try {
            const res = await PaystackService.resolveAccountNumber(accountNumber, bankCode);
            const name = res?.data?.account_name ?? res?.account_name ?? '';

            if (name) {
                setAccountName(name);
            } else {
                setResolveError(res?.message || 'Could not verify this account. Check the number and bank.');
            }
        } catch {
            setResolveError('Could not verify this account. Check the number and bank.');
        } finally {
            setResolving(false);
        }
    };

    const pickBank = (name) => {
        const bank = banks.find((b) => b.name === name);
        setData((d) => ({ ...d, bank_name: name, bank_code: bank?.code ?? '' }));
        setAccountName('');
        setResolveError('');
        verify(data.account_number, bank?.code ?? '');
    };

    const changeAccount = (value) => {
        const digits = value.replace(/\D/g, '').slice(0, 10);
        setData('account_number', digits);
        setAccountName('');
        setResolveError('');
        verify(digits, data.bank_code);
    };

    const detailsDone = data.full_name.trim() !== ''
        && /^\d{11}$/.test(data.phone_number)
        && data.gender !== ''
        && data.lga_id !== '';

    // A face, and one ID with its number and a picture of it.
    const identityDone = data.passport_photograph
        && data.id_type !== ''
        && data.id_number.trim() !== ''
        && data.id_document;

    // Nothing is submitted until the bank has confirmed whose account it is.
    const canSubmit = detailsDone && identityDone && accountName && !resolving && !processing;

    const submit = (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        // Photographs ride along, so the whole thing goes as form data.
        post(route('transport-agent.store'), { forceFormData: true });
    };

    const field = 'w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition bg-white';
    const label = 'block text-sm font-bold text-gray-700 mb-2';
    const errCls = 'mt-1.5 text-xs text-red-600';

    return (
        <>
            <Head title="Transport Agent Registration" />

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900 to-orange-900 py-10 px-4">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -left-32 w-96 h-96 bg-amber-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />
                    <div className="absolute -bottom-40 -right-32 w-96 h-96 bg-orange-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1.5s' }} />
                </div>

                <div className="relative z-10 max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-2xl mb-4 rotate-3">
                            <svg className="w-8 h-8 text-amber-600 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                                    d="M8 17h8m-8 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m12 0a2 2 0 104 0m-4 0a2 2 0 114 0M3 6h13v11H3V6zm13 4h3.5L22 13v4h-6v-7z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg tracking-tight">
                            Transport Agent Registration
                        </h1>
                        <p className="text-white/70 mt-3 text-sm max-w-md mx-auto">
                            Register to go out and capture transportation vehicles and their owners in your LGA.
                        </p>
                    </div>

                    <form onSubmit={submit} className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5">
                        <div>
                            <label className={label}>Full Name <span className="text-red-500">*</span></label>
                            <input type="text" value={data.full_name}
                                onChange={(e) => setData('full_name', e.target.value)}
                                placeholder="Surname Firstname Othernames"
                                className={field} />
                            {errors.full_name && <p className={errCls}>{errors.full_name}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={label}>Phone Number <span className="text-red-500">*</span></label>
                                <input type="tel" inputMode="numeric" value={data.phone_number}
                                    onChange={(e) => setData('phone_number', e.target.value.replace(/\D/g, '').slice(0, 11))}
                                    placeholder="08012345678"
                                    className={`${field} tabular-nums tracking-wide`} />
                                {errors.phone_number
                                    ? <p className={errCls}>{errors.phone_number}</p>
                                    : <p className="mt-1.5 text-xs text-gray-400">{data.phone_number.length}/11 digits</p>}
                            </div>

                            <div>
                                <label className={label}>WhatsApp Number</label>
                                <input type="tel" inputMode="numeric" value={data.whatsapp_number}
                                    onChange={(e) => setData('whatsapp_number', e.target.value.replace(/\D/g, '').slice(0, 11))}
                                    placeholder="Same as phone if blank"
                                    className={`${field} tabular-nums tracking-wide`} />
                                {errors.whatsapp_number && <p className={errCls}>{errors.whatsapp_number}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={label}>Gender <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Male', 'Female'].map((g) => (
                                        <button key={g} type="button" onClick={() => setData('gender', g)}
                                            className={`py-3 rounded-xl text-sm font-bold border-2 transition ${
                                                data.gender === g
                                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}>
                                            {g}
                                        </button>
                                    ))}
                                </div>
                                {errors.gender && <p className={errCls}>{errors.gender}</p>}
                            </div>

                            <div>
                                <label className={label}>LGA <span className="text-red-500">*</span></label>
                                <select value={data.lga_id} onChange={(e) => setData('lga_id', e.target.value)} className={field}>
                                    <option value="">— Select your LGA —</option>
                                    {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                                {errors.lga_id
                                    ? <p className={errCls}>{errors.lga_id}</p>
                                    : <p className="mt-1.5 text-xs text-gray-400">Local government only.</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={label}>Email</label>
                                <input type="email" value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="you@example.com"
                                    className={field} />
                                {errors.email && <p className={errCls}>{errors.email}</p>}
                            </div>

                            <div>
                                <label className={label}>Home Address</label>
                                <input type="text" value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    placeholder="Street and town"
                                    className={field} />
                                {errors.address && <p className={errCls}>{errors.address}</p>}
                            </div>
                        </div>

                        {/* Identity — a face and one government ID, so the person
                            being paid can be matched to the person who registered. */}
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4 mt-4">Photograph & ID</p>

                            <div className="space-y-5">
                                <PhotoField
                                    label="Passport Photograph"
                                    hint="A clear photo of your face, taken now or picked from your device."
                                    required
                                    camera="user"
                                    tall
                                    file={data.passport_photograph}
                                    error={errors.passport_photograph}
                                    onPick={(f) => setData('passport_photograph', f)}
                                    onClear={() => setData('passport_photograph', null)}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={label}>Type of ID <span className="text-red-500">*</span></label>
                                        <select value={data.id_type} onChange={(e) => setData('id_type', e.target.value)} className={field}>
                                            <option value="">— Select your ID —</option>
                                            {Object.entries(idTypes).map(([key, name]) => (
                                                <option key={key} value={key}>{name}</option>
                                            ))}
                                        </select>
                                        {errors.id_type && <p className={errCls}>{errors.id_type}</p>}
                                    </div>

                                    <div>
                                        <label className={label}>ID Number <span className="text-red-500">*</span></label>
                                        <input type="text" value={data.id_number}
                                            onChange={(e) => setData('id_number', e.target.value.toUpperCase().slice(0, 50))}
                                            placeholder={data.id_type ? 'Number on the ID' : 'Select the ID type first'}
                                            disabled={!data.id_type}
                                            className={`${field} tabular-nums tracking-wide disabled:bg-gray-50 disabled:text-gray-400`} />
                                        {errors.id_number && <p className={errCls}>{errors.id_number}</p>}
                                    </div>
                                </div>

                                <PhotoField
                                    label="Picture of the ID"
                                    hint="Photograph the ID itself, or upload a scan. The number must be readable."
                                    required
                                    file={data.id_document}
                                    error={errors.id_document}
                                    onPick={(f) => setData('id_document', f)}
                                    onClear={() => setData('id_document', null)}
                                />
                            </div>
                        </div>

                        {/* Bank details, same page — money follows these, so they
                            are separated by a rule rather than by a step. */}
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4 mt-4">Bank Account</p>

                            <div className="space-y-5">
                                <div>
                                    <label className={label}>Bank Name <span className="text-red-500">*</span></label>
                                    <select value={data.bank_name} onChange={(e) => pickBank(e.target.value)} className={field}>
                                        <option value="">{banks.length === 0 ? 'Loading banks…' : '— Select your bank —'}</option>
                                        {banks.map((b) => <option key={b.code} value={b.name}>{b.name}</option>)}
                                    </select>
                                    {errors.bank_name && <p className={errCls}>{errors.bank_name}</p>}
                                </div>

                                <div>
                                    <label className={label}>Account Number <span className="text-red-500">*</span></label>
                                    <input type="text" inputMode="numeric" value={data.account_number}
                                        onChange={(e) => changeAccount(e.target.value)}
                                        placeholder="10-digit account number"
                                        className={`${field} tabular-nums tracking-wide`} />
                                    {errors.account_number
                                        ? <p className={errCls}>{errors.account_number}</p>
                                        : <p className="mt-1.5 text-xs text-gray-400">{data.account_number.length}/10 digits</p>}
                                </div>

                                {/* The bank's answer, not something anyone types. */}
                                {resolving && (
                                    <div className="rounded-2xl bg-blue-50 border-2 border-blue-100 px-4 py-3 flex items-center gap-2.5">
                                        <svg className="animate-spin w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <p className="text-sm text-blue-800">Checking with the bank…</p>
                                    </div>
                                )}

                                {accountName && !resolving && (
                                    <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 px-4 py-3">
                                        <p className="text-[11px] font-semibold uppercase text-emerald-600/70">Account verified</p>
                                        <p className="text-lg font-bold text-emerald-800 mt-0.5">{accountName}</p>
                                        <p className="text-xs text-emerald-700/70 mt-1">
                                            Not your name? Check the account number and bank before submitting.
                                        </p>
                                    </div>
                                )}

                                {resolveError && !resolving && (
                                    <div className="rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3">
                                        <p className="text-sm font-semibold text-red-800">{resolveError}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button type="submit" disabled={!canSubmit}
                            className="w-full py-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 shadow-lg hover:shadow-xl transition-all">
                            {processing
                                ? 'Submitting…'
                                : !detailsDone
                                    ? 'Fill in your details to continue'
                                    : !identityDone
                                        ? 'Add your photograph and ID to continue'
                                        : accountName
                                            ? 'Complete Registration'
                                            : 'Verify your account to continue'}
                        </button>

                        <p className="text-center text-xs text-gray-400">
                            Payments go to the account above, so make sure the verified name is yours.
                        </p>
                    </form>
                </div>
            </div>
        </>
    );
}
