import { useRef, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

/**
 * One uploaded name with the databoys in its LGA that resemble it.
 *
 * The pick lives in the parent so a bulk approval can read what each row is
 * set to — the suggestion is pre-selected for speed, but it is still a choice
 * someone can change before anything is approved.
 */
function Row({ row, index, picked, onPick, selected, onSelect, generalAmount, busy, setBusy }) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const effectiveAmount = Number(amount) || Number(generalAmount) || 0;
    const candidate = row.candidates.find((c) => c.id === picked);

    const approve = () => {
        if (!picked || effectiveAmount <= 0) return;

        if (!confirm(
            `Approve "${row.uploaded_name}" as ${candidate.name}?\n\n`
            + `Compensation: ${naira(effectiveAmount)}\n\n`
            + `They move to Awaiting Compensation Payment. No money leaves yet.`
        )) return;

        setBusy(`approve-${row.id}`);
        router.post(route('admin.databoy-compensation.approve', row.id),
            { databoy_id: picked, amount: effectiveAmount, note },
            { preserveScroll: true, onFinish: () => setBusy(null) });
    };

    return (
        <div className={`border-2 rounded-2xl overflow-hidden transition ${selected ? 'border-indigo-400 bg-indigo-50/30' : 'border-gray-200'}`}>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <input type="checkbox" checked={selected} onChange={() => onSelect(row.id)}
                        disabled={row.candidates.length === 0}
                        title={row.candidates.length === 0 ? 'No match to approve' : 'Select for bulk approval'}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30" />
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-500 flex items-center justify-center tabular-nums">
                        {index}
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800">{row.uploaded_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {row.uploaded_lga}
                            {!row.lga_id && <span className="ml-1 text-amber-600 font-semibold">· LGA not recognised</span>}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { if (confirm(`Reject "${row.uploaded_name}"?`)) router.post(route('admin.databoy-compensation.reject', row.id), {}, { preserveScroll: true }); }}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition">
                    Reject
                </button>
            </div>

            <div className="p-4 space-y-3">
                {row.candidates.length === 0 ? (
                    <p className="text-sm text-gray-400">
                        {row.lga_id
                            ? 'No databoy in this LGA has a similar name. Reject it, or correct the sheet and upload again.'
                            : 'The LGA on the sheet does not match any Osun LGA, so there is no roster to search.'}
                    </p>
                ) : (
                    <>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                            Databoys in {row.uploaded_lga} — pick the right one
                        </p>

                        <div className="space-y-1.5">
                            {row.candidates.map((c) => (
                                <button key={c.id} onClick={() => onPick(row.id, c.id)}
                                    className={`w-full text-left rounded-xl border-2 px-3 py-2.5 transition flex items-center justify-between gap-3 ${
                                        picked === c.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                                    }`}>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                                        <p className="text-xs text-gray-500 tabular-nums">{c.phone || 'no phone'}</p>
                                    </div>
                                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg ${
                                        c.exact ? 'bg-emerald-100 text-emerald-700'
                                            : c.score >= 80 ? 'bg-blue-100 text-blue-700'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {c.exact ? 'exact' : `${c.score}%`}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex gap-2 flex-wrap items-end">
                            <div className="flex-1 min-w-[130px]">
                                <label className="block text-xs font-bold text-gray-600 mb-1">
                                    Amount {generalAmount > 0 && <span className="font-normal text-gray-400">(blank = {naira(generalAmount)})</span>}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₦</span>
                                    <input type="number" min="1" step="0.01" value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder={generalAmount > 0 ? String(generalAmount) : '0.00'}
                                        className="w-full pl-7 pr-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-bold text-gray-600 mb-1">Note (optional)</label>
                                <input type="text" value={note} maxLength={255}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Why this one"
                                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <button onClick={approve} disabled={busy === `approve-${row.id}` || !picked || effectiveAmount <= 0}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 transition whitespace-nowrap">
                                {busy === `approve-${row.id}` ? 'Approving…' : `Approve ${naira(effectiveAmount)}`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function DataboyCompensations({ rows = [], status = 'pending', counts = {} }) {
    const { flash, errors } = usePage().props;
    const [busy, setBusy] = useState(null);
    const [generalAmount, setGeneralAmount] = useState('');
    const [picks, setPicks] = useState({});
    const [selected, setSelected] = useState([]);
    const fileRef = useRef(null);

    // The best candidate is pre-selected so an obvious match needs no clicks,
    // but any row can be pointed at someone else before approving.
    const pickFor = (row) => picks[row.id] ?? row.candidates[0]?.id ?? null;

    const onPick = (rowId, databoyId) => setPicks((p) => ({ ...p, [rowId]: databoyId }));
    const onSelect = (rowId) => setSelected((s) => s.includes(rowId) ? s.filter((x) => x !== rowId) : [...s, rowId]);

    const selectable = rows.filter((r) => r.candidates.length > 0);
    const allSelected = selectable.length > 0 && selected.length === selectable.length;
    const toggleAll = () => setSelected(allSelected ? [] : selectable.map((r) => r.id));

    const amount = Number(generalAmount) || 0;

    // Exactly ONE exact match. A row with two databoys of the same name in the
    // same LGA is not unambiguous — auto-approving it would be a coin toss, so
    // it stays for a person to decide.
    const exactRows = rows.filter((r) => r.candidates.filter((c) => c.exact).length === 1);
    const ambiguous = rows.filter((r) => r.candidates.filter((c) => c.exact).length > 1);

    const selectExact = () => {
        setPicks((p) => ({
            ...p,
            ...Object.fromEntries(exactRows.map((r) => [r.id, r.candidates.find((c) => c.exact).id])),
        }));
        setSelected(exactRows.map((r) => r.id));
    };

    const approveExact = () => {
        if (exactRows.length === 0 || amount <= 0) return;

        if (!confirm(
            `Approve all ${exactRows.length} exact name match(es) at ${naira(amount)} each?\n\n`
            + `Total: ${naira(amount * exactRows.length)}\n`
            + (ambiguous.length > 0
                ? `\n${ambiguous.length} row(s) have more than one databoy with that exact name and are left for you to decide.\n`
                : '')
            + `\nNo money leaves yet — they move to Awaiting Compensation Payment.`
        )) return;

        setBusy('exact');
        router.post(route('admin.databoy-compensation.approve-bulk'), {
            amount,
            rows: exactRows.map((r) => ({ id: r.id, databoy_id: r.candidates.find((c) => c.exact).id })),
        }, {
            preserveScroll: true,
            onSuccess: () => setSelected([]),
            onFinish: () => setBusy(null),
        });
    };

    const approveSelected = () => {
        if (selected.length === 0 || amount <= 0) return;

        const payload = selected
            .map((id) => ({ id, databoy_id: pickFor(rows.find((r) => r.id === id)) }))
            .filter((r) => r.databoy_id);

        if (!confirm(
            `Approve ${payload.length} databoy(s) at ${naira(amount)} each?\n\n`
            + `Total: ${naira(amount * payload.length)}\n\n`
            + `Each is approved as the databoy currently selected on their row. No money leaves yet.`
        )) return;

        setBusy('bulk');
        router.post(route('admin.databoy-compensation.approve-bulk'), { amount, rows: payload }, {
            preserveScroll: true,
            onSuccess: () => setSelected([]),
            onFinish: () => setBusy(null),
        });
    };

    const upload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy('import');
        router.post(route('admin.databoy-compensation.import'), { file }, {
            forceFormData: true,
            onFinish: () => { setBusy(null); if (fileRef.current) fileRef.current.value = ''; },
        });
    };

    const tabs = [
        ['pending', 'To review', counts.pending],
        ['approved', 'Approved', counts.approved],
        ['rejected', 'Rejected', counts.rejected],
        ['all', 'All', counts.all],
    ];

    return (
        <AdminLayout title="Databoy Compensation">
            <div className="max-w-5xl mx-auto space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Databoy Compensation</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Upload names and LGAs, confirm who each one is, then set what they are owed.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={route('admin.awaiting-compensation-payment')}
                            className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition whitespace-nowrap">
                            Awaiting Payment ({counts.approved ?? 0})
                        </Link>
                        <input ref={fileRef} type="file" className="hidden" accept=".csv,.txt,.xlsx,.xls,.ods" onChange={upload} />
                        <button onClick={() => fileRef.current?.click()} disabled={busy === 'import'}
                            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl transition">
                            {busy === 'import' ? 'Uploading…' : 'Upload List'}
                        </button>
                    </div>
                </div>

                {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{flash.error}</div>}
                {errors?.file && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errors.file}</div>}
                {errors?.amount && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errors.amount}</div>}

                <div className="flex gap-1.5 flex-wrap">
                    {tabs.map(([key, labelText, count]) => (
                        <button key={key}
                            onClick={() => { setSelected([]); router.get(route('admin.databoy-compensation'), { status: key }, { preserveScroll: true }); }}
                            className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
                                status === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}>
                            {labelText} ({count ?? 0})
                        </button>
                    ))}
                </div>

                {/* One amount for the whole run, with bulk approval beside it. */}
                {status === 'pending' && rows.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 sticky top-2 z-10">
                        <div className="flex items-end gap-3 flex-wrap">
                            <div className="flex-1 min-w-[180px]">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Compensation amount for everyone</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₦</span>
                                    <input type="number" min="1" step="0.01" value={generalAmount}
                                        onChange={(e) => setGeneralAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-7 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                            </div>

                            <div className="text-sm text-gray-600">
                                <p>{selected.length} of {selectable.length} selected</p>
                                <p className="font-bold text-gray-800">{naira(amount * selected.length)} total</p>
                            </div>

                            <button onClick={selectExact} disabled={exactRows.length === 0}
                                title="Tick every row whose name matches exactly, without approving yet"
                                className="px-4 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                                Select exact ({exactRows.length})
                            </button>

                            <button onClick={toggleAll} disabled={selectable.length === 0}
                                className="px-4 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                                {allSelected ? 'Clear all' : `Select all ${selectable.length}`}
                            </button>

                            <button onClick={approveSelected} disabled={busy === 'bulk' || selected.length === 0 || amount <= 0}
                                title={amount <= 0 ? 'Enter the amount first' : ''}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                                {busy === 'bulk' ? 'Approving…' : `Approve ${selected.length} selected`}
                            </button>
                        </div>

                        {/* One click for the unambiguous ones — the bulk of a clean sheet. */}
                        {exactRows.length > 0 && (
                            <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
                                <p className="text-xs text-emerald-800">
                                    <span className="font-bold">{exactRows.length} row(s) match a databoy name exactly.</span>{' '}
                                    {ambiguous.length > 0
                                        ? `${ambiguous.length} other(s) have two databoys with the same name and are left for you.`
                                        : 'Nothing ambiguous among them.'}
                                </p>
                                <button onClick={approveExact} disabled={busy === 'exact' || amount <= 0}
                                    title={amount <= 0 ? 'Enter the amount first' : ''}
                                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl transition whitespace-nowrap">
                                    {busy === 'exact' ? 'Approving…' : `Approve all ${exactRows.length} exact`}
                                </button>
                            </div>
                        )}

                        <p className="text-xs text-gray-400">
                            Each selected row is approved as the databoy highlighted on it — the closest match is picked for you,
                            so check any row that isn't marked <span className="font-semibold text-emerald-600">exact</span> before approving in bulk.
                        </p>
                    </div>
                )}

                {rows.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                        <p className="text-sm text-gray-400">
                            {counts.all === 0 ? 'Nothing uploaded yet.' : `Nothing ${status === 'all' ? '' : status} here.`}
                        </p>
                        {counts.all === 0 && (
                            <>
                                <button onClick={() => fileRef.current?.click()} className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                                    Upload a list →
                                </button>
                                <p className="mt-4 text-xs text-gray-400">
                                    Two columns: <span className="font-mono">Databoy Name</span> and <span className="font-mono">LGA</span>.
                                </p>
                            </>
                        )}
                    </div>
                ) : status === 'pending' ? (
                    <div className="space-y-3">
                        {rows.map((row, i) => (
                            <Row key={row.id} row={row} index={i + 1}
                                picked={pickFor(row)} onPick={onPick}
                                selected={selected.includes(row.id)} onSelect={onSelect}
                                generalAmount={amount} busy={busy} setBusy={setBusy} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['#', 'Uploaded Name', 'LGA', 'Matched Databoy', 'Phone', 'Amount', 'Status', 'Note', ''].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {rows.map((r, i) => (
                                        <tr key={r.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">{i + 1}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{r.uploaded_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.uploaded_lga}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{r.matched?.name ?? '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{r.matched?.phone ?? '—'}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-800 whitespace-nowrap tabular-nums">{r.amount ? naira(r.amount) : '—'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-lg capitalize ${
                                                    r.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                                                        : r.status === 'rejected' ? 'bg-red-100 text-red-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 max-w-[180px] truncate" title={r.note}>{r.note ?? '—'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <button
                                                    onClick={() => router.post(route('admin.databoy-compensation.reopen', r.id), {}, { preserveScroll: true })}
                                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition">
                                                    Reopen
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm(`Remove ${r.uploaded_name}?`)) router.delete(route('admin.databoy-compensation.destroy', r.id), { preserveScroll: true }); }}
                                                    className="ml-3 text-xs font-semibold text-red-500 hover:text-red-700 transition">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
