export default function ExportButtons({ routeName }) {
    const options = [
        { status: 'all', label: 'Export All', color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
        { status: 'success', label: 'Export Success', color: 'text-green-700 bg-green-50 hover:bg-green-100' },
        { status: 'failed', label: 'Export Failed', color: 'text-red-700 bg-red-50 hover:bg-red-100' },
    ];

    return (
        <div className="flex gap-2 flex-wrap">
            {options.map((o) => (
                <a
                    key={o.status}
                    href={route(routeName, { status: o.status })}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition whitespace-nowrap ${o.color}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H8a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {o.label}
                </a>
            ))}
        </div>
    );
}
