import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
    Landmark, MapPin, MapPinned, ChevronRight, X, Download,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { getCountries, getStates, previewGeoImport, importGeoData } from '@/Services/apiService';

function Step({ n, label, active, done }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition ${
                done   ? 'bg-green-500 text-white'  :
                active ? 'bg-indigo-700 text-white'  :
                         'bg-gray-200 text-gray-400'
            }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : n}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${
                active ? 'text-indigo-900' : done ? 'text-green-600' : 'text-gray-400'
            }`}>{label}</span>
        </div>
    );
}

function StepDivider({ done }) {
    return <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />;
}

function StatCard({ icon: Icon, color, label, value }) {
    const colors = {
        blue:  'bg-blue-50 border-blue-100 text-blue-700',
        green: 'bg-green-50 border-green-100 text-green-700',
        amber: 'bg-amber-50 border-amber-100 text-amber-700',
    };
    return (
        <div className={`rounded-xl border p-4 text-center ${colors[color]}`}>
            <Icon className="w-6 h-6 mx-auto mb-1 opacity-70" />
            <p className="text-2xl font-extrabold">{Number(value).toLocaleString()}</p>
            <p className="text-xs mt-0.5 opacity-75">{label}</p>
        </div>
    );
}

function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
    );
}

export default function GeoImport() {
    const [step, setStep]             = useState(1);
    const [countries, setCountries]   = useState([]);
    const [states, setStates]         = useState([]);
    const [countryId, setCountryId]   = useState('');
    const [stateId, setStateId]       = useState('');
    const [stateName, setStateName]   = useState('');
    const [file, setFile]             = useState(null);
    const [dragging, setDragging]     = useState(false);
    const [preview, setPreview]       = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [importing, setImporting]   = useState(false);
    const [result, setResult]         = useState(null);
    const fileRef = useRef();

    useEffect(() => {
        getCountries()
            .then((data) => setCountries(Array.isArray(data) ? data : (data.data ?? [])))
            .catch(() => {});
    }, []);

    const handleCountryChange = async (id) => {
        setCountryId(id);
        setStateId('');
        setStateName('');
        setStates([]);
        if (!id) return;
        try {
            const data = await getStates(id);
            setStates(Array.isArray(data) ? data : (data.data ?? []));
        } catch {
            toast.error('Failed to load states');
        }
    };

    const handleStateChange = (id) => {
        setStateId(id);
        const s = states.find((s) => String(s.id) === String(id));
        setStateName(s?.name ?? '');
        if (id) setStep((prev) => Math.max(prev, 2));
    };

    const handleFileSelect = (f) => {
        if (!f) return;
        const ext = f.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(ext)) {
            toast.error('Only CSV or Excel files are supported');
            return;
        }
        setFile(f);
        setPreview(null);
        setResult(null);
        setStep((prev) => Math.max(prev, 2));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        handleFileSelect(e.dataTransfer.files[0]);
    };

    const handlePreview = async () => {
        if (!stateId || !file) return;
        setPreviewing(true);
        try {
            const data = await previewGeoImport(stateId, file);
            setPreview(data);
            setStep(3);
        } catch (err) {
            const msg = err?.response?.data?.errors
                ? Object.values(err.response.data.errors).flat().join(' ')
                : 'Preview failed — check the file format.';
            toast.error(msg);
        } finally {
            setPreviewing(false);
        }
    };

    const handleImport = async () => {
        setImporting(true);
        try {
            const data = await importGeoData(stateId, file);
            setResult(data.stats);
            setStep(4);
            toast.success(data.message);
        } catch (err) {
            const msg = err?.response?.data?.errors
                ? Object.values(err.response.data.errors).flat().join(' ')
                : err?.response?.data?.message ?? 'Import failed.';
            toast.error(msg);
        } finally {
            setImporting(false);
        }
    };

    const reset = () => {
        setStep(1); setCountryId(''); setStateId(''); setStateName('');
        setStates([]); setFile(null); setPreview(null); setResult(null);
    };

    const downloadSample = () => {
        const csv = [
            'STATE NAME,STATE CODE,LGA NAME,LGA CODE,WARD NAME,WARD CODE,POLLING STATION LOCATION/NAME,POLLING STATION CODE',
            'OSUN,OS,OSOGBO,1,OSOGBO CENTRAL,1,SECRETARIAT - SECRETARIAT I,1',
            'OSUN,OS,OSOGBO,1,OSOGBO CENTRAL,1,SECRETARIAT - SECRETARIAT II,2',
            'OSUN,OS,IFE CENTRAL,2,IFE CENTRAL 1,1,OBA\'S PALACE - OBA\'S PALACE A,1',
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'geo_import_sample.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const canPreview = stateId && file;

    return (
        <AdminLayout title="Geo Import">
            <Toaster position="top-right" />
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Geographic Data Import</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Bulk-seed LGAs, wards and polling units for a state from a CSV or Excel file.
                        </p>
                    </div>
                    <button
                        onClick={downloadSample}
                        className="flex items-center gap-2 text-sm text-indigo-700 border border-indigo-200 rounded-lg px-3 py-2 hover:bg-indigo-50 transition shrink-0"
                    >
                        <Download className="w-4 h-4" /> Sample CSV
                    </button>
                </div>

                {/* Step indicators */}
                <div className="flex items-center bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                    <Step n={1} label="Select State" active={step === 1} done={!!stateId && step > 1} />
                    <StepDivider done={!!stateId && step > 1} />
                    <Step n={2} label="Upload File"  active={step === 2} done={!!file && step > 2} />
                    <StepDivider done={!!file && step > 2} />
                    <Step n={3} label="Preview"      active={step === 3} done={step >= 4} />
                    <StepDivider done={step >= 4} />
                    <Step n={4} label="Done"         active={step === 4} done={false} />
                </div>

                {/* Step 4: Result */}
                {step === 4 && result && (
                    <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-8 text-center space-y-5">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Import Complete!</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Records created for <span className="font-semibold text-indigo-900">{stateName}</span>:
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <StatCard icon={Landmark}  color="blue"  label="LGAs Created"         value={result.lgas} />
                            <StatCard icon={MapPinned} color="green" label="Wards Created"        value={result.wards} />
                            <StatCard icon={MapPin}    color="amber" label="Polling Units Created" value={result.polling_units} />
                        </div>
                        <p className="text-xs text-gray-400">Existing records were skipped — no duplicates created.</p>
                        <button
                            onClick={reset}
                            className="mx-auto flex items-center gap-2 bg-indigo-700 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-800 transition text-sm font-semibold"
                        >
                            Import Another State
                        </button>
                    </div>
                )}

                {/* Steps 1–3 */}
                {step < 4 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                        {/* Step 1: Country + State */}
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold">1</div>
                                <h3 className="font-semibold text-gray-800">Select Country &amp; State</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Country</label>
                                    <select
                                        value={countryId}
                                        onChange={(e) => handleCountryChange(e.target.value)}
                                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                                    >
                                        <option value="">Select country…</option>
                                        {countries.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">State</label>
                                    <select
                                        value={stateId}
                                        onChange={(e) => handleStateChange(e.target.value)}
                                        disabled={!countryId || states.length === 0}
                                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                                    >
                                        <option value="">Select state…</option>
                                        {states.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: File upload */}
                        <div className={`p-6 border-b border-gray-100 transition ${!stateId ? 'opacity-40 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold">2</div>
                                <h3 className="font-semibold text-gray-800">Upload File</h3>
                                <span className="text-xs text-gray-400 ml-1">CSV, XLS or XLSX · max 10 MB</span>
                            </div>

                            {file ? (
                                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                                    <FileSpreadsheet className="w-8 h-8 text-indigo-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-indigo-900 truncate">{file.name}</p>
                                        <p className="text-xs text-indigo-400">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button
                                        onClick={() => { setFile(null); setPreview(null); }}
                                        className="text-indigo-300 hover:text-red-500 transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
                                        dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-gray-600">Drag &amp; drop your file here</p>
                                    <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        className="hidden"
                                        onChange={(e) => handleFileSelect(e.target.files[0])}
                                    />
                                </div>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                                {['LGA NAME', 'WARD NAME', 'POLLING STATION LOCATION/NAME'].map((col) => (
                                    <span key={col} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-mono">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" /> {col}
                                    </span>
                                ))}
                                <span className="text-xs text-gray-400 self-center">— required columns</span>
                            </div>
                        </div>

                        {/* Step 3: Preview & Import */}
                        <div className={`p-6 transition ${!canPreview ? 'opacity-40 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold">3</div>
                                <h3 className="font-semibold text-gray-800">Preview &amp; Import</h3>
                            </div>

                            {preview ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-green-800">
                                                Matched state: <span className="font-bold">{stateName.toUpperCase()}</span>
                                            </p>
                                            <p className="text-xs text-green-600 mt-0.5">
                                                {preview.rows?.toLocaleString()} rows matched this state.
                                                {preview.file_states?.length > 1 && (
                                                    <span className="ml-1 text-green-500">
                                                        (File also has: {preview.file_states.filter((s) => s.toUpperCase() !== stateName.toUpperCase()).join(', ')})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <StatCard icon={Landmark}  color="blue"  label="LGAs found"         value={preview.lga_count} />
                                        <StatCard icon={MapPinned} color="green" label="Wards found"        value={preview.ward_count} />
                                        <StatCard icon={MapPin}    color="amber" label="Polling Units found" value={preview.pu_count} />
                                    </div>

                                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                            LGAs detected for {stateName}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {(preview.lgas ?? []).map((lga, i) => (
                                                <span key={i} className="text-xs bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-lg font-medium">
                                                    {lga}
                                                </span>
                                            ))}
                                            {preview.lga_count > 5 && (
                                                <span className="text-xs text-gray-400 self-center">+ {preview.lga_count - 5} more</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
                                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                        <p>
                                            Existing records will be <strong>skipped</strong> — no duplicates created.
                                            This will add up to <strong>{Number(preview.pu_count).toLocaleString()} polling units</strong> to{' '}
                                            <strong>{stateName}</strong>.
                                        </p>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleImport}
                                            disabled={importing}
                                            className="flex-1 flex items-center justify-center gap-2 bg-indigo-700 text-white font-semibold py-3 rounded-xl hover:bg-indigo-800 disabled:opacity-50 transition text-sm"
                                        >
                                            {importing ? <><Spinner /> Importing…</> : <><Upload className="w-4 h-4" /> Confirm &amp; Import</>}
                                        </button>
                                        <button
                                            onClick={() => { setPreview(null); setStep(2); }}
                                            className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
                                        >
                                            Change File
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handlePreview}
                                    disabled={!canPreview || previewing}
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition text-sm"
                                >
                                    {previewing ? <><Spinner /> Analysing file…</> : <><ChevronRight className="w-4 h-4" /> Preview Import</>}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Format guide */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expected File Format</p>
                    <div className="overflow-x-auto">
                        <table className="text-xs w-full border-collapse">
                            <thead>
                                <tr className="bg-indigo-900 text-white">
                                    {['STATE NAME','STATE CODE','LGA NAME ✓','LGA CODE','WARD NAME ✓','WARD CODE','POLLING STATION LOCATION/NAME ✓','POLLING STATION CODE'].map((h) => (
                                        <th key={h} className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${h.includes('✓') ? '' : 'opacity-40'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['OSUN','OS','OSOGBO','1','OSOGBO CENTRAL','1','SECRETARIAT - SECRETARIAT I','1'],
                                    ['OSUN','OS','OSOGBO','1','OSOGBO CENTRAL','1','SECRETARIAT - SECRETARIAT II','2'],
                                    ['OSUN','OS','IFE CENTRAL','2','IFE CENTRAL 1','1','OBA\'S PALACE - BLOCK A','1'],
                                ].map((row, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                        {row.map((cell, j) => (
                                            <td key={j} className={`px-3 py-2 border-b border-gray-100 ${[2,4,6].includes(j) ? 'font-medium text-indigo-800' : 'text-gray-400'}`}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Columns marked <span className="text-indigo-700 font-semibold">✓</span> are used. All others are ignored.
                    </p>
                </div>

            </div>
        </AdminLayout>
    );
}
