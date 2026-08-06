import { useState, useRef } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function AttendanceImport({ existing = 0 }) {
    const { flash, errors } = usePage().props;
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);

    const pick = (f) => { if (f) setFile(f); };

    const submit = (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);
        router.post(route('admin.attendance.import.store'), { file }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { setFile(null); if (inputRef.current) inputRef.current.value = ''; },
            onFinish: () => setUploading(false),
        });
    };

    return (
        <AdminLayout title="Import Attendance">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Import Attendance List</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Upload a spreadsheet of attendees. Everyone starts as absent until marked present.
                        </p>
                    </div>
                    <Link href={route('admin.attendance')}
                        className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition whitespace-nowrap">
                        Attendance ({existing}) →
                    </Link>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {errors?.file && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errors.file}</div>}

                <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
                        onClick={() => inputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl px-6 py-10 text-center cursor-pointer transition ${
                            dragging ? 'border-indigo-400 bg-indigo-50' : file ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                        }`}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            className="hidden"
                            accept=".csv,.txt,.xlsx,.xls,.xlsm,.ods,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={(e) => pick(e.target.files?.[0])}
                        />

                        {file ? (
                            <>
                                <svg className="w-10 h-10 mx-auto text-emerald-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm font-semibold text-gray-800 break-all">{file.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} KB · click to choose a different file</p>
                            </>
                        ) : (
                            <>
                                <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-sm font-semibold text-gray-700">Drop your file here, or click to browse</p>
                                <p className="text-xs text-gray-400 mt-1">CSV, XLSX, XLS, ODS — up to 20 MB</p>
                            </>
                        )}
                    </div>

                    <button type="submit" disabled={!file || uploading}
                        className="mt-5 w-full py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 transition">
                        {uploading ? 'Importing…' : 'Import Attendees'}
                    </button>
                </form>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-bold text-gray-700 mb-2">How the file is read</h2>
                    <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                        <li><strong>Required:</strong> name, LGA and phone number. WhatsApp is optional.</li>
                        <li>Column headings are matched by name, in any order — <span className="font-mono">Name</span>, <span className="font-mono">LGA</span>, <span className="font-mono">Phone Number</span>, <span className="font-mono">WhatsApp</span> and common variations all work.</li>
                        <li>No headings? The columns are read in order: name, LGA, phone, whatsapp.</li>
                        <li>Rows missing a name, LGA or phone number are skipped and counted back to you.</li>
                        <li>LGAs are matched against Osun state's — spelling, case and punctuation don't matter. An unrecognised LGA is kept as typed and flagged.</li>
                        <li>Leading zeros Excel dropped from phone numbers are restored.</li>
                        <li>Re-uploading matches people by phone number and updates them instead of creating duplicates — <strong>anyone already marked present stays present</strong>.</li>
                    </ul>
                </div>
            </div>
        </AdminLayout>
    );
}
