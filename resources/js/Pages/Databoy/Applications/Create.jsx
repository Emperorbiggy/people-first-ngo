import { useState, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import DataboyLayout from '@/Layouts/DataboyLayout';
import axios from 'axios';

const STATES = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
    'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe',
    'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara',
    'Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau',
    'Rivers','Sokoto','Taraba','Yobe','Zamfara',
];
const NETWORKS    = ['MTN','GLO','AIRTEL','9MOBILE'];
const EMPLOYMENT  = ['Employed','Unemployed','Student','Self-employed','Corp member','Recently passed out Corp member'];
const GRADE_LEVELS = Array.from({ length: 17 }, (_, i) => `Level ${i + 1}`);
const AVAILABILITY = [
    { value: 'all_opportunities', label: 'I am Available for all opportunities' },
    { value: 'southwest_travel',  label: 'Available for short-time contract work (travel within South West)' },
    { value: 'outside_state',     label: 'Available for 30-day contract work outside my state' },
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
    { name: 'Kuda Bank', code: '090267' }, { name: 'Opay', code: '100004' },
    { name: 'PalmPay', code: '999991' }, { name: 'Moniepoint', code: '50515' },
];

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';
const errCls   = 'mt-1 text-xs text-red-600';

function Section({ title, children }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 text-base pb-3 border-b border-gray-100 mb-5">{title}</h3>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

export default function Create({ states: geoStates = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        full_name: '', gender: '', age: '', email_address: '',
        calling_phone_number: '', whatsapp_number: '',
        state_of_residence: '',
        lga_id: '', ward_id: '', polling_unit_id: '',
        house_address: '',
        browsing_network: '', browsing_number: '',
        bank_name: '', bank_code: '', account_number: '', bank_account_name: '',
        employment_status: '', availability: '',
        current_occupation: '', work_grade_level: '',
        has_voter_card: false,
        passport_photograph: null, valid_id_card: null, highest_qualification_certificate: null,
    });

    // Geo cascade state
    const [lgas, setLgas]               = useState([]);
    const [wards, setWards]             = useState([]);
    const [pollingUnits, setPollingUnits] = useState([]);
    const [loadingLgas, setLoadingLgas]   = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);
    const [loadingPUs, setLoadingPUs]     = useState(false);

    // Use geo states if available, otherwise the LGA cascade won't work
    // We still let state_of_residence be any state string
    const [selectedGeoStateId, setSelectedGeoStateId] = useState('');

    const [passportName, setPassportName] = useState('');
    const [idCardName, setIdCardName]     = useState('');
    const [certName, setCertName]         = useState('');
    const passportRef = useRef();
    const idCardRef   = useRef();
    const certRef     = useRef();

    const handleStateChange = async (stateId) => {
        setSelectedGeoStateId(stateId);
        setData((d) => ({ ...d, lga_id: '', ward_id: '', polling_unit_id: '' }));
        setLgas([]); setWards([]); setPollingUnits([]);
        if (!stateId) return;
        setLoadingLgas(true);
        try {
            const { data: res } = await axios.get(route('databoy.api.lgas', { state: stateId }));
            setLgas(res);
        } catch { /* silent */ } finally { setLoadingLgas(false); }
    };

    const handleLgaChange = async (lgaId) => {
        setData((d) => ({ ...d, lga_id: lgaId, ward_id: '', polling_unit_id: '' }));
        setWards([]); setPollingUnits([]);
        if (!lgaId) return;
        setLoadingWards(true);
        try {
            const { data: res } = await axios.get(route('databoy.api.wards', { lga: lgaId }));
            setWards(res);
        } catch { /* silent */ } finally { setLoadingWards(false); }
    };

    const handleWardChange = async (wardId) => {
        setData((d) => ({ ...d, ward_id: wardId, polling_unit_id: '' }));
        setPollingUnits([]);
        if (!wardId) return;
        setLoadingPUs(true);
        try {
            const { data: res } = await axios.get(route('databoy.api.polling-units', { ward: wardId }));
            setPollingUnits(res);
        } catch { /* silent */ } finally { setLoadingPUs(false); }
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
        post(route('databoy.applications.store'), { forceFormData: true });
    };

    return (
        <DataboyLayout title="Add Application">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-gray-800">Add Application</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Register an applicant for the NGO Contract Work Programme.</p>
                </div>

                <form onSubmit={submit} className="space-y-5">

                    {/* Personal Information */}
                    <Section title="Personal Information">
                        <div>
                            <label className={labelCls}>Full Name *</label>
                            <input type="text" value={data.full_name} onChange={(e) => setData('full_name', e.target.value)}
                                placeholder="Enter your full name as it appears on your ID" className={inputCls} />
                            {errors.full_name && <p className={errCls}>{errors.full_name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Gender *</label>
                                <select value={data.gender} onChange={(e) => setData('gender', e.target.value)} className={inputCls}>
                                    <option value="">Select gender</option>
                                    <option>Male</option><option>Female</option>
                                </select>
                                {errors.gender && <p className={errCls}>{errors.gender}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Age *</label>
                                <input type="number" min="18" max="60" value={data.age}
                                    onChange={(e) => setData('age', e.target.value)}
                                    placeholder="18–60" className={inputCls} />
                                {errors.age && <p className={errCls}>{errors.age}</p>}
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Email Address *</label>
                            <input type="email" value={data.email_address}
                                onChange={(e) => setData('email_address', e.target.value)}
                                placeholder="applicant@example.com" className={inputCls} />
                            {errors.email_address && <p className={errCls}>{errors.email_address}</p>}
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
                            <label className={labelCls}>State of Residence *</label>
                            <select value={data.state_of_residence}
                                onChange={(e) => setData('state_of_residence', e.target.value)} className={inputCls}>
                                <option value="">Select your state</option>
                                {STATES.map((s) => <option key={s}>{s}</option>)}
                            </select>
                            {errors.state_of_residence && <p className={errCls}>{errors.state_of_residence}</p>}
                        </div>

                        <div>
                            <label className={labelCls}>House Address *</label>
                            <textarea value={data.house_address}
                                onChange={(e) => setData('house_address', e.target.value)}
                                rows={2} placeholder="Enter complete residential address including street name, house number, and landmark"
                                className={inputCls} />
                            {errors.house_address && <p className={errCls}>{errors.house_address}</p>}
                        </div>
                    </Section>

                    {/* Location / Geo */}
                    <Section title="Location (LGA, Ward &amp; Polling Unit)">
                        {geoStates.length === 0 ? (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
                                No geo data imported yet. Ask the admin to import geographic data, then LGA/ward/polling unit will be available here.
                            </p>
                        ) : (
                            <>
                                <div>
                                    <label className={labelCls}>Select State (for LGA/Ward)</label>
                                    <select value={selectedGeoStateId} onChange={(e) => handleStateChange(e.target.value)} className={inputCls}>
                                        <option value="">Select state…</option>
                                        {geoStates.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelCls}>LGA *</label>
                                    <select value={data.lga_id}
                                        onChange={(e) => handleLgaChange(e.target.value)}
                                        disabled={!selectedGeoStateId || loadingLgas}
                                        className={inputCls}>
                                        <option value="">{loadingLgas ? 'Loading…' : 'Select LGA…'}</option>
                                        {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                    {errors.lga_id && <p className={errCls}>{errors.lga_id}</p>}
                                </div>

                                <div>
                                    <label className={labelCls}>Ward *</label>
                                    <select value={data.ward_id}
                                        onChange={(e) => handleWardChange(e.target.value)}
                                        disabled={!data.lga_id || loadingWards}
                                        className={inputCls}>
                                        <option value="">{loadingWards ? 'Loading…' : 'Select Ward…'}</option>
                                        {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                    {errors.ward_id && <p className={errCls}>{errors.ward_id}</p>}
                                </div>

                                <div>
                                    <label className={labelCls}>Polling Unit</label>
                                    <select value={data.polling_unit_id}
                                        onChange={(e) => setData('polling_unit_id', e.target.value)}
                                        disabled={!data.ward_id || loadingPUs}
                                        className={inputCls}>
                                        <option value="">{loadingPUs ? 'Loading…' : 'Select Polling Unit…'}</option>
                                        {pollingUnits.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    {errors.polling_unit_id && <p className={errCls}>{errors.polling_unit_id}</p>}
                                </div>
                            </>
                        )}

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={data.has_voter_card}
                                onChange={(e) => setData('has_voter_card', e.target.checked)}
                                className="accent-indigo-600 w-4 h-4" />
                            <span className="text-sm text-gray-700">Applicant has a Voter's Card</span>
                        </label>
                    </Section>

                    {/* Bank & Network */}
                    <Section title="Bank &amp; Network Information">
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

                        {(data.employment_status === 'Employed' || data.employment_status === 'Self-employed') && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Current Occupation</label>
                                    <input type="text" value={data.current_occupation}
                                        onChange={(e) => setData('current_occupation', e.target.value)}
                                        placeholder="Your current occupation" className={inputCls} />
                                </div>
                                {data.employment_status === 'Employed' && (
                                    <div>
                                        <label className={labelCls}>Work Grade Level</label>
                                        <select value={data.work_grade_level}
                                            onChange={(e) => setData('work_grade_level', e.target.value)} className={inputCls}>
                                            <option value="">Select grade level</option>
                                            {GRADE_LEVELS.map((l) => <option key={l}>{l}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label className={labelCls}>Availability for Contract Work *</label>
                            <div className="space-y-2">
                                {AVAILABILITY.map((a) => (
                                    <label key={a.value} className="flex items-start gap-3 cursor-pointer">
                                        <input type="radio" name="availability" value={a.value}
                                            checked={data.availability === a.value}
                                            onChange={() => setData('availability', a.value)}
                                            className="mt-0.5 accent-indigo-600" />
                                        <span className="text-sm text-gray-700">{a.label}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.availability && <p className={errCls}>{errors.availability}</p>}
                        </div>
                    </Section>

                    {/* Documents */}
                    <Section title="Document Uploads">
                        {[
                            { label: 'White Background Passport Photograph *', field: 'passport_photograph', ref: passportRef, name: passportName, setName: setPassportName, accept: '.jpg,.jpeg,.png', hint: 'JPEG, PNG (max 2MB) · White background required' },
                            { label: 'Valid ID Card *', field: 'valid_id_card', ref: idCardRef, name: idCardName, setName: setIdCardName, accept: '.pdf,.jpg,.jpeg,.png', hint: 'PDF, JPEG, PNG (max 5MB) · National ID, Driver\'s License, or Voter\'s Card' },
                            { label: 'Highest Qualification Certificate *', field: 'highest_qualification_certificate', ref: certRef, name: certName, setName: setCertName, accept: '.pdf,.jpg,.jpeg,.png', hint: 'PDF, JPEG, PNG (max 5MB) · Degree, Diploma, or Certificate' },
                        ].map(({ label, field, ref, name, setName, accept, hint }) => (
                            <div key={field}>
                                <label className={labelCls}>{label}</label>
                                <div className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-400 bg-white"
                                    onClick={() => ref.current.click()}>
                                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    <span className={`text-sm truncate ${name ? 'text-indigo-700 font-medium' : 'text-gray-500'}`}>
                                        {name || 'No file chosen'}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-400">{hint}</p>
                                <input ref={ref} type="file" accept={accept} className="hidden"
                                    onChange={(e) => handleFile(field, e.target.files[0], setName)} />
                                {errors[field] && <p className={errCls}>{errors[field]}</p>}
                            </div>
                        ))}
                    </Section>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-3.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold rounded-2xl shadow transition text-sm"
                    >
                        {processing ? 'Submitting…' : 'Submit Application'}
                    </button>
                </form>
            </div>
        </DataboyLayout>
    );
}
