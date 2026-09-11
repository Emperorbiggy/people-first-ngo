import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';

const NAV = [
    {
        label: 'Dashboard',
        href: 'transport-agent.dashboard',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        label: 'Register Vehicle',
        href: 'transport-agent.vehicles',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M8 17h8m-8 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m12 0a2 2 0 104 0m-4 0a2 2 0 114 0M3 6h13v11H3V6zm13 4h3.5L22 13v4h-6v-7z" />
            </svg>
        ),
    },
    {
        label: 'My Profile',
        href: 'transport-agent.profile',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
];

export default function TransportAgentLayout({ title, children }) {
    // Shared by HandleInertiaRequests, so it is present on every page here —
    // page-level `agent` props carry their own richer payloads.
    const {
        transportAgent: agent,
        flash,
        transportAgentIdentityComplete: identityComplete = true,
    } = usePage().props;
    const [menuOpen, setMenuOpen] = useState(false);

    // Until the passport and ID are in, every other page bounces back to the
    // profile — so offering those links would only lead in a circle.
    const nav = identityComplete ? NAV : NAV.filter((item) => item.href === 'transport-agent.profile');

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const link = (item) => {
        const href = route(item.href);
        const active = currentPath === new URL(href, window.location.origin).pathname;

        return (
            <Link key={item.href} href={href} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    active ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-100 hover:bg-amber-800/60'
                }`}>
                {item.icon}
                {item.label}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {title && <Head title={title} />}

            {/* Sidebar — a drawer on phones, fixed from large screens up. */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-amber-900 flex flex-col transition-transform lg:translate-x-0 ${
                menuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <div className="px-5 py-5 border-b border-amber-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M8 17h8m-8 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m12 0a2 2 0 104 0m-4 0a2 2 0 114 0M3 6h13v11H3V6zm13 4h3.5L22 13v4h-6v-7z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-white text-sm leading-tight">Transport Agent</p>
                            <p className="text-amber-300 text-xs truncate">{agent?.lga_name}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {nav.map(link)}

                    {!identityComplete && (
                        <p className="px-4 pt-3 text-[11px] leading-relaxed text-amber-300/80">
                            Add your passport photograph and ID to unlock the rest of the portal.
                        </p>
                    )}
                </nav>

                <div className="px-3 py-4 border-t border-amber-800">
                    <p className="px-4 text-xs text-amber-300 truncate">{agent?.full_name}</p>
                    <p className="px-4 text-[11px] text-amber-400/70 tabular-nums">{agent?.phone_number}</p>
                    <button onClick={() => router.post(route('transport-agent.logout'))}
                        className="mt-2 w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-200 hover:bg-red-900/40 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Log out
                    </button>
                </div>
            </aside>

            {menuOpen && (
                <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} />
            )}

            <div className="lg:pl-64">
                <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
                    <div className="px-4 sm:px-6 py-3.5 flex items-center gap-3">
                        <button onClick={() => setMenuOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className="font-bold text-gray-800">{title}</h1>
                    </div>
                </header>

                <main className="px-4 sm:px-6 py-5">
                    {flash?.success && (
                        <div className="max-w-5xl mx-auto mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="max-w-5xl mx-auto mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                            {flash.error}
                        </div>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
}
