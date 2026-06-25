import { useState, useRef } from 'react';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';

const NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
const EMPLOYMENT = ['Employed', 'Unemployed', 'Student', 'Self-employed', 'Corp member', 'Recently passed out Corp member'];
const AVAILABILITY = [
    { value: 'all_opportunities', label: 'I am Available for all opportunities' },
    { value: 'southwest_travel',  label: 'I am available for a short-time contract work that will require me to travel within South West' },
    { value: 'outside_state',     label: 'I am available for a 30-day contract work in a state outside my state of residence' },
    { value: 'not_available',     label: 'I am not available' },
];
const BANKS = [
    { name: 'Access Bank', code: '044' }, { name: 'Zenith Bank', code: '057' },
    { name: 'GTBank', code: '058' }, { name: 'First Bank', code: '011' },
    { name: 'UBA', code: '033' }, { name: 'Fidelity Bank', code: '070' },
    { name: 'Sterling Bank', code: '232' }, { name: 'Keystone Bank', code: '082' },
    { name: 'Union Bank', code: '032' }, { name: 'Wema Bank', code: '035' },
    { name: 'Stanbic IBTC', code: '221' }, { name: 'FCMB', code: '214' },
    { name: 'Polaris Bank', code: '076' }, { name: 'Ecobank', code: '050' },
    { name: 'Heritage Bank', code: '030' }, { name: 'Providus Bank', code: '101' },
    { name: 'Kuda Bank', code: '090267' }, { name: 'Opay', code: '100004' },
    { name: 'PalmPay', code: '999991' }, { name: 'Moniepoint', code: '50515' },
];

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';
const errCls   = 'mt-1 text-xs text-red-600';

function SectionTitle({ children }) {
    return (
        <div className="flex items-center gap-2 py-3 border-b border-gray-100 mb-5">
            <h3 className="font-bold text-gray-800 text-base">{children}</h3>
        </div>
    );
}

export default function Register({ states = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        full_name: '', gender: '', age: '',
        working_email: '', calling_phone_number: '', whatsapp_number: '',
        state_id: '', lga_id: '', ward_id: '',
        house_address: '',
        browsing_network: '', browsing_number: '',
        bank_name: '', bank_code: '', account_number: '', bank_account_name: '',
        employment_status: '', availability: '',
        passport_photograph: null, valid_id_card: null, highest_qualification_certificate: null,
    });

    const [lgas, setLgas]             = useState([]);
    const [wards, setWards]           = useState([]);
    const [loadingLgas, setLoadingLgas]   = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);
    const [passportName, setPassportName] = useState('');
    const [idCardName, setIdCardName]     = useState('');
    const [certName, setCertName]         = useState('');

    const passportRef = useRef();
    const idCardRef   = useRef();
    const certRef     = useRef();

    const handleStateChange = async (stateId) => {
        setData((d) => ({ ...d, state_id: stateId, lga_id: '', ward_id: '' }));
        setLgas([]); setWards([]);
        if (!stateId) return;
        setLoadingLgas(true);
        try {
            const { data: res } = await axios.get(route('databoy.api.lgas', { state: stateId }));
            setLgas(res);
        } catch { /* silent */ } finally { setLoadingLgas(false); }
    };

    const handleLgaChange = async (lgaId) => {
        setData((d) => ({ ...d, lga_id: lgaId, ward_id: '' }));
        setWards([]);
        if (!lgaId) return;
        setLoadingWards(true);
        try {
            const { data: res } = await axios.get(route('databoy.api.available-wards', { lga: lgaId }));
            setWards(res);
        } catch { /* silent */ } finally { setLoadingWards(false); }
    };

    const handleBankChange = (name) => {
        const bank = BANKS.find((b) => b.name === name);
        setData((d) => ({ ...d, bank_name: name, bank_code: bank?.code ?? '' }));
    };

    const handleFile = (field, file, setName) => {
        if (!file) return;
        setData(field, file);
        setName(file.name);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('databoy.register.store'), { forceFormData: true });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-gray-50 py-8 px-4">
            <Head title="Databoy Registration" />

            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Databoy Registration</h1>
                    <p className="text-sm text-gray-500 mt-1">People First NGO · Data Registration Programme</p>
                </div>

                <form onSubmit={submit} className="space-y-6">

                    {/* Personal Information */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <SectionTitle>Personal Information</SectionTitle>
                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>Full Name *</label>
                                <input type="text" value={data.full_name} onChange={(e) => setData('full_name', e.target.value)}
                                    placeholder="Enter your full name as it appears on your ID"
                                    className={inputCls} />
                                {errors.full_name && <p className={errCls}>{errors.full_name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Gender *</label>
                                    <select value={data.gender} onChange={(e) => setData('gender', e.target.value)} className={inputCls}>
                                        <option value="">Select gender</option>
                                        <option>Male</option>
                                        <option>Female</option>
                                    </select>
                                    {errors.gender && <p className={errCls}>{errors.gender}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>Age *</label>
                                    <input type="number" min="18" max="60" value={data.age}
                                        onChange={(e) => setData('age', e.target.value)}
                                        placeholder="Enter your age (18–60)" className={inputCls} />
                                    {errors.age && <p className={errCls}>{errors.age}</p>}
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Working Email Address *</label>
                                <input type="email" value={data.working_email}
                                    onChange={(e) => setData('working_email', e.target.value)}
                                    placeholder="your.email@example.com" className={inputCls} />
                                {errors.working_email && <p className={errCls}>{errors.working_email}</p>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Calling Phone Number *</label>
                                    <input type="tel" value={data.calling_phone_number}
                                        onChange={(e) => setData('calling_phone_number', e.target.value)}
                                        placeholder="+234 800 000 0000" className={inputCls} />
                                    {errors.calling_phone_number && <p className={errCls}>{errors.calling_phone_number}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>WhatsApp Number *</label>
                                    <input type="tel" value={data.whatsapp_number}
                                        onChange={(e) => setData('whatsapp_number', e.target.value)}
                                        placeholder="+234 800 000 0000" className={inputCls} />
                                    {errors.whatsapp_number && <p className={errCls}>{errors.whatsapp_number}</p>}
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>House Address *</label>
                                <textarea value={data.house_address}
                                    onChange={(e) => setData('house_address', e.target.value)}
                                    rows={2} placeholder="Enter your complete residential address including street name, house number, and landmark"
                                    className={inputCls} />
                                {errors.house_address && <p className={errCls}>{errors.house_address}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <SectionTitle>Location Details</SectionTitle>
                        {states.length === 0 ? (
                            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
                                No states available. Please ask the admin to import geographic data first.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className={labelCls}>State *</label>
                                    <select value={data.state_id} onChange={(e) => handleStateChange(e.target.value)} className={inputCls}>
                                        <option value="">Select state…</option>
                                        {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    {errors.state_id && <p className={errCls}>{errors.state_id}</p>}
                                </div>

                                <div>
                                    <label className={labelCls}>LGA *</label>
                                    <select value={data.lga_id}
                                        onChange={(e) => handleLgaChange(e.target.value)}
                                        disabled={!data.state_id || loadingLgas}
                                        className={inputCls}>
                                        <option value="">{loadingLgas ? 'Loading…' : 'Select LGA…'}</option>
                                        {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                    {errors.lga_id && <p className={errCls}>{errors.lga_id}</p>}
                                </div>

                                <div>
                                    <label className={labelCls}>Ward *</label>
                                    <select value={data.ward_id}
                                        onChange={(e) => setData('ward_id', e.target.value)}
                                        disabled={!data.lga_id || loadingWards}
                                        className={inputCls}>
                                        <option value="">{loadingWards ? 'Loading…' : 'Select Ward…'}</option>
                                        {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                    {errors.ward_id && <p className={errCls}>{errors.ward_id}</p>}
                                    {data.lga_id && !loadingWards && wards.length === 0 && (
                                        <p className="mt-1 text-xs text-amber-600">All wards in this LGA are already registered.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bank & Network */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <SectionTitle>Bank &amp; Network Information</SectionTitle>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Browsing Network *</label>
                                    <select value={data.browsing_network}
                                        onChange={(e) => setData('browsing_network', e.target.value)} className={inputCls}>
                                        <option value="">Select your network</option>
                                        {NETWORKS.map((n) => <option key={n}>{n}</option>)}
                                    </select>
                                    {errors.browsing_network && <p className={errCls}>{errors.browsing_network}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>Browsing Number *</label>
                                    <input type="tel" value={data.browsing_number}
                                        onChange={(e) => setData('browsing_number', e.target.value)}
                                        placeholder="Your browsing network number" className={inputCls} />
                                    {errors.browsing_number && <p className={errCls}>{errors.browsing_number}</p>}
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Select Your Bank *</label>
                                <select value={data.bank_name} onChange={(e) => handleBankChange(e.target.value)} className={inputCls}>
                                    <option value="">Select your bank</option>
                                    {BANKS.map((b) => <option key={b.code} value={b.name}>{b.name}</option>)}
                                </select>
                                {errors.bank_name && <p className={errCls}>{errors.bank_name}</p>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Account Number *</label>
                                    <input type="text" maxLength={10} value={data.account_number}
                                        onChange={(e) => setData('account_number', e.target.value)}
                                        placeholder="Your 10-digit bank account number" className={inputCls} />
                                    {errors.account_number && <p className={errCls}>{errors.account_number}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>Bank Account Name *</label>
                                    <input type="text" value={data.bank_account_name}
                                        onChange={(e) => setData('bank_account_name', e.target.value)}
                                        placeholder="Account name as on your bank" className={inputCls} />
                                    {errors.bank_account_name && <p className={errCls}>{errors.bank_account_name}</p>}
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Employment Status *</label>
                                <select value={data.employment_status}
                                    onChange={(e) => setData('employment_status', e.target.value)} className={inputCls}>
                                    <option value="">Select your employment status</option>
                                    {EMPLOYMENT.map((s) => <option key={s}>{s}</option>)}
                                </select>
                                {errors.employment_status && <p className={errCls}>{errors.employment_status}</p>}
                            </div>

                            <div>
                                <label className={labelCls}>Availability for Contract Work *</label>
                                <div className="space-y-2">
                                    {AVAILABILITY.map((a) => (
                                        <label key={a.value} className="flex items-start gap-3 cursor-pointer group">
                                            <input type="radio" name="availability" value={a.value}
                                                checked={data.availability === a.value}
                                                onChange={() => setData('availability', a.value)}
                                                className="mt-0.5 accent-indigo-600" />
                                            <span className="text-sm text-gray-700 group-hover:text-indigo-700">{a.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.availability && <p className={errCls}>{errors.availability}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Document Uploads */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <SectionTitle>Document Uploads</SectionTitle>
                        <div className="space-y-5">
                            {/* Passport */}
                            <div>
                                <label className={labelCls}>White Background Passport Photograph *</label>
                                <div
                                    onClick={() => passportRef.current.click()}
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition"
                                >
                                    {passportName ? (
                                        <p className="text-sm font-medium text-indigo-700">{passportName}</p>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-600 font-medium">Upload Passport Photo</p>
                                            <p className="text-xs text-gray-400 mt-1">JPEG, PNG (max 2MB) · White background required</p>
                                        </>
                                    )}
                                </div>
                                <input ref={passportRef} type="file" accept=".jpg,.jpeg,.png" className="hidden"
                                    onChange={(e) => handleFile('passport_photograph', e.target.files[0], setPassportName)} />
                                {errors.passport_photograph && <p className={errCls}>{errors.passport_photograph}</p>}
                            </div>

                            {/* Valid ID */}
                            <div>
                                <label className={labelCls}>Valid ID Card *</label>
                                <div className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-400 bg-white"
                                    onClick={() => idCardRef.current.click()}>
                                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    <span className="text-sm text-gray-600 truncate">{idCardName || 'No file chosen'}</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-400">PDF, JPEG, PNG, JPG (max 5MB) · National ID, Driver's License, or Voter's Card</p>
                                <input ref={idCardRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                    onChange={(e) => handleFile('valid_id_card', e.target.files[0], setIdCardName)} />
                                {errors.valid_id_card && <p className={errCls}>{errors.valid_id_card}</p>}
                            </div>

                            {/* Certificate */}
                            <div>
                                <label className={labelCls}>Highest Qualification Certificate *</label>
                                <div className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-400 bg-white"
                                    onClick={() => certRef.current.click()}>
                                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    <span className="text-sm text-gray-600 truncate">{certName || 'No file chosen'}</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-400">PDF, JPEG, PNG, JPG (max 5MB) · Degree, Diploma, or Certificate</p>
                                <input ref={certRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                    onChange={(e) => handleFile('highest_qualification_certificate', e.target.files[0], setCertName)} />
                                {errors.highest_qualification_certificate && <p className={errCls}>{errors.highest_qualification_certificate}</p>}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-3.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold rounded-2xl shadow transition text-sm"
                    >
                        {processing ? 'Submitting…' : 'Submit Registration'}
                    </button>

                    <p className="text-center text-sm text-gray-500">
                        Already registered?{' '}
                        <a href={route('databoy.login')} className="text-indigo-600 hover:underline font-medium">
                            Login here
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
