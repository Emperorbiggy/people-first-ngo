import { useRef, useState } from 'react';

/**
 * Collects phone numbers either by typing/pasting them or by uploading a sheet.
 * Hands the parsed list up via onChange; the parent owns network and amount.
 *
 * Typed numbers are normalised here the same way the server does (leading zero
 * restored, +234 folded) so the preview matches what will actually be sent.
 */
export default function PhoneNumberPicker({ numbers, onChange, onUpload, uploading = false, error }) {
    const [mode, setMode] = useState('type');
    const [text, setText] = useState('');
    const fileRef = useRef(null);

    const normalise = (raw) => {
        let digits = String(raw).replace(/\D/g, '');
        if (digits.startsWith('234') && digits.length === 13) digits = '0' + digits.slice(3);
        if (digits.length === 10 && digits[0] !== '0') digits = '0' + digits;
        return digits.length >= 10 ? digits : null;
    };

    const addTyped = () => {
        const parsed = text.split(/[\s,;]+/).map(normalise).filter(Boolean);
        if (parsed.length === 0) return;
        onChange([...new Set([...(numbers ?? []), ...parsed])]);
        setText('');
    };

    const drop = (n) => onChange((numbers ?? []).filter((x) => x !== n));

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                {[['type', 'Type numbers'], ['file', 'Import contacts']].map(([m, labelText]) => (
                    <button key={m} type="button" onClick={() => setMode(m)}
                        className={`px-3 py-2 text-xs font-semibold rounded-xl transition ${
                            mode === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {labelText}
                    </button>
                ))}
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-700">{error}</div>}

            {mode === 'type' ? (
                <div>
                    <textarea
                        rows={3}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addTyped(); }}
                        placeholder="08012345678, 08023456789 — or one per line"
                        className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                    />
                    <button type="button" onClick={addTyped} disabled={!text.trim()}
                        className="mt-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-40 transition">
                        Add number(s)
                    </button>
                    <p className="mt-2 text-xs text-gray-400">Separate with commas, spaces or new lines. Duplicates are collapsed.</p>
                </div>
            ) : (
                <div>
                    <input ref={fileRef} type="file" className="hidden" accept=".csv,.txt,.xlsx,.xls,.ods"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
                    <div onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-gray-50 rounded-xl px-4 py-6 text-center cursor-pointer transition">
                        <p className="text-sm font-semibold text-gray-700">
                            {uploading ? 'Reading file…' : 'Choose a CSV or Excel file'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Needs one column: <span className="font-mono">Phone Number</span></p>
                    </div>
                </div>
            )}

            {(numbers?.length ?? 0) > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-bold text-gray-600">{numbers.length} number(s)</p>
                        <button type="button" onClick={() => onChange([])} className="text-xs font-semibold text-red-500 hover:text-red-700">
                            Clear all
                        </button>
                    </div>
                    <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-gray-50">
                        {numbers.map((n) => (
                            <div key={n} className="px-3 py-2 flex items-center justify-between">
                                <span className="text-sm text-gray-700 tabular-nums">{n}</span>
                                <button type="button" onClick={() => drop(n)} className="text-xs font-semibold text-red-500 hover:text-red-700">
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
