import { useEffect, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import PaystackService from '@/services/paystack';

export default function Create({ lgas = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        application_id: '',
        full_name: '',
        phone_number: '',
        lga_id: '',
        gender: '',
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

    // Application ID must start with osu_ — any casing.
    const appIdValid = /^osu_/i.test(data.application_id.trim());
    const appIdTouched = data.application_id.trim().length > 0;

    const verify = async (accountNumber, bankCode) => {
        if (accountNumber.length !== 10 || !bankCode) return;

        setResolving(true);
        setAccountName('');
        setResolveError('');

        try {
            // The endpoint hands back Paystack's own shape: {status, data:{account_name}}
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

    // Nothing is submitted until the bank has confirmed whose account it is.
    const canSubmit = appIdValid && accountName && !resolving && !processing;

    const submit = (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        post(route('e-form.store'));
    };

    const field = 'w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white';
    const label = 'block text-sm font-bold text-gray-700 mb-2';
    const errCls = 'mt-1.5 text-xs text-red-600';

    return (
        <>
            <Head title="E-Form" />

            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-900 py-10 px-4">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-32 w-96 h-96 bg-indigo-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />
                    <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-emerald-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1.5s' }} />
                </div>

                <div className="relative z-10 max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg tracking-tight">E-Form</h1>
                        <p className="text-white/70 mt-3 text-sm max-w-md mx-auto">
                            Fill in your details exactly as they appear on your application and bank records.
                        </p>
                    </div>

                    <form onSubmit={submit} className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5">
                        <div>
                            <label className={label}>Application ID <span className="text-red-500">*</span></label>
                            <input
                                type="text" value={data.application_id}
                                onChange={(e) => setData('application_id', e.target.value)}
                                placeholder="e.g. osu_12345"
                                className={`${field} ${appIdTouched && !appIdValid ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''}`}
                            />
                            {errors.application_id
                                ? <p className={errCls}>{errors.application_id}</p>
                                : appIdTouched && !appIdValid
                                    ? <p className={errCls}>Application ID must start with “osu_”.</p>
                                    : <p className="mt-1.5 text-xs text-gray-400">Must start with <span className="font-mono font-semibold">osu_</span></p>}
                        </div>

                        <div>
                            <label className={label}>Full Name <span className="text-red-500">*</span></label>
                            <input
                                type="text" value={data.full_name}
                                onChange={(e) => setData('full_name', e.target.value)}
                                placeholder="Surname Firstname Othernames"
                                className={field}
                            />
                            {errors.full_name && <p className={errCls}>{errors.full_name}</p>}
                        </div>

                        <div>
                            <label className={label}>Phone Number <span className="text-red-500">*</span></label>
                            <input
                                type="tel" inputMode="numeric" value={data.phone_number}
                                onChange={(e) => setData('phone_number', e.target.value.replace(/\D/g, '').slice(0, 11))}
                                placeholder="e.g. 08012345678"
                                className={`${field} tabular-nums tracking-wide`}
                            />
                            {errors.phone_number
                                ? <p className={errCls}>{errors.phone_number}</p>
                                : <p className="mt-1.5 text-xs text-gray-400">{data.phone_number.length}/11 digits</p>}
                        </div>

                        <div>
                            <label className={label}>LGA of Training <span className="text-red-500">*</span></label>
                            <select value={data.lga_id} onChange={(e) => setData('lga_id', e.target.value)} className={field}>
                                <option value="">— Select your LGA of training —</option>
                                {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            {errors.lga_id && <p className={errCls}>{errors.lga_id}</p>}
                        </div>

                        <div>
                            <label className={label}>Gender <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-2 gap-3">
                                {['Male', 'Female'].map((g) => (
                                    <button
                                        key={g} type="button"
                                        onClick={() => setData('gender', g)}
                                        className={`py-3 rounded-xl text-sm font-bold border-2 transition ${
                                            data.gender === g
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                        }`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                            {errors.gender && <p className={errCls}>{errors.gender}</p>}
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4 mt-4">Bank Details</p>

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
                                    <label className={label}>Bank Account Number <span className="text-red-500">*</span></label>
                                    <input
                                        type="text" inputMode="numeric" value={data.account_number}
                                        onChange={(e) => changeAccount(e.target.value)}
                                        placeholder="10-digit account number"
                                        className={`${field} tabular-nums tracking-wide`}
                                    />
                                    {errors.account_number
                                        ? <p className={errCls}>{errors.account_number}</p>
                                        : <p className="mt-1.5 text-xs text-gray-400">
                                            {data.account_number.length}/10 digits
                                            {data.account_number.length === 10 && !data.bank_code ? ' — now select your bank' : ''}
                                          </p>}
                                </div>

                                {/* Account verification result */}
                                {resolving && (
                                    <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                                        <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <p className="text-xs text-gray-500">Verifying account with the bank…</p>
                                    </div>
                                )}

                                {accountName && !resolving && (
                                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl px-4 py-3">
                                        <p className="text-[11px] font-semibold uppercase text-emerald-600/70">Account Name</p>
                                        <p className="text-sm font-bold text-emerald-900 mt-0.5">{accountName}</p>
                                        <p className="text-[11px] text-emerald-700/70 mt-1">
                                            Not your name? Correct the account number or bank before submitting.
                                        </p>
                                    </div>
                                )}

                                {resolveError && !resolving && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                        <p className="text-xs text-red-700">{resolveError}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="w-full py-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
                        >
                            {processing ? 'Submitting…' : resolving ? 'Verifying account…' : 'Submit E-Form'}
                        </button>

                        <p className="text-center text-xs text-gray-400">
                            {!accountName
                                ? 'Your account must be verified before you can submit.'
                                : 'Payments are sent to the account shown above.'}
                        </p>
                    </form>
                </div>
            </div>
        </>
    );
}
