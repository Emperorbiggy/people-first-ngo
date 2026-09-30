import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';

const NAV = [
    {
        label: 'Dashboard',
        href: 'transport-admin.dashboard',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        label: 'Transport Agents',
        href: 'transport-admin.agents',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M17 20h5v-1a3 3 0 00-3-3h-1m-4 4H2v-1a5 5 0 015-5h4a5 5 0 015 5v1zm-2-13a3 3 0 11-6 0 3 3 0 016 0zm7 1a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
    },
    {
        label: 'Vehicle Register',
        href: 'transport-admin.vehicles',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M8 17h8m-8 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m12 0a2 2 0 104 0m-4 0a2 2 0 114 0M3 6h13v11H3V6zm13 4h3.5L22 13v4h-6v-7z" />
            </svg>
        ),
    },
];

export default function TransportAdminLayout({ title, children }) {
    const { transportAdmin: admin, flash } = usePage().props;
    const [menuOpen, setMenuOpen] = useState(false);

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const link = (item) => {
        const href = route(item.href);
        const target = new URL(href, window.location.origin).pathname;
        // Prefix match, so an agent's detail page keeps Agents highlighted.
        const active = currentPath === target || currentPath.startsWith(`${target}/`);

        return (
            <Link key={item.href} href={href} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    active ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800/70'
                }`}>
                {item.icon}
                {item.label}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {title && <Head title={`${title} · Transport Panel`} />}

            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 flex flex-col transition-transform lg:translate-x-0 ${
                menuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <div className="px-5 py-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M8 17h8m-8 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m12 0a2 2 0 104 0m-4 0a2 2 0 114 0M3 6h13v11H3V6zm13 4h3.5L22 13v4h-6v-7z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-white text-sm leading-tight">Transport Panel</p>
                            <p className="text-slate-400 text-xs truncate">Vehicle register</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">{NAV.map(link)}</nav>

                <div className="px-3 py-4 border-t border-slate-800">
                    <p className="px-4 text-xs text-slate-300 truncate">{admin?.full_name}</p>
                    <p className="px-4 text-[11px] text-slate-500 truncate">{admin?.email}</p>
                    <button onClick={() => router.post(route('transport-admin.logout'))}
                        className="mt-2 w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-900/30 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Log out
                    </button>
                </div>
            </aside>

            {menuOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} />}

            <div className="lg:pl-64">
                <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
                    <div className="px-4 sm:px-6 py-3.5 flex items-center gap-3">
                        <button onClick={() => setMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className="font-bold text-gray-800">{title}</h1>
                    </div>
                </header>

                <main className="px-4 sm:px-6 py-5">
                    {flash?.success && (
                        <div className="max-w-7xl mx-auto mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="max-w-7xl mx-auto mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                            {flash.error}
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
