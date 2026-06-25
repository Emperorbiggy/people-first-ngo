import { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';

export default function DataboyLayout({ title, children }) {
    const { databoy, flash } = usePage().props;
    const [menuOpen, setMenuOpen] = useState(false);

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const navLink = (href, label) => {
        const active = currentPath === new URL(route(href), window.location.origin).pathname;
        return (
            <Link
                href={route(href)}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium transition ${
                    active
                        ? 'bg-indigo-700 text-white'
                        : 'text-indigo-100 hover:bg-indigo-700/60'
                }`}
            >
                {label}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {title && <Head title={title} />}

            {/* Top nav */}
            <nav className="bg-indigo-900 shadow">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="font-bold text-white text-sm">Databoy Portal</span>
                    </div>

                    {/* Desktop nav */}
                    <div className="hidden sm:flex items-center gap-1">
                        {navLink('databoy.dashboard', 'Dashboard')}
                        {navLink('databoy.applications.index', 'My Applications')}
                        {navLink('databoy.applications.create', '+ Add Application')}
                    </div>

                    <div className="hidden sm:flex items-center gap-3">
                        <span className="text-indigo-300 text-xs">{databoy?.full_name}</span>
                        <Link
                            href={route('databoy.logout')}
                            method="post"
                            as="button"
                            className="text-xs text-red-300 hover:text-red-200 font-medium transition"
                        >
                            Logout
                        </Link>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="sm:hidden w-8 h-8 flex items-center justify-center text-white rounded"
                        onClick={() => setMenuOpen((v) => !v)}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                        </svg>
                    </button>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="sm:hidden border-t border-indigo-700 px-4 py-3 space-y-1">
                        {navLink('databoy.dashboard', 'Dashboard')}
                        {navLink('databoy.applications.index', 'My Applications')}
                        {navLink('databoy.applications.create', '+ Add Application')}
                        <div className="pt-2 border-t border-indigo-700 mt-2">
                            <p className="text-xs text-indigo-400 px-4 mb-1">{databoy?.full_name}</p>
                            <Link
                                href={route('databoy.logout')}
                                method="post"
                                as="button"
                                className="block px-4 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/30"
                            >
                                Logout
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Flash messages */}
            {flash?.success && (
                <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-800">
                        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {flash.success}
                    </div>
                </div>
            )}
            {flash?.error && (
                <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
                        {flash.error}
                    </div>
                </div>
            )}

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {children}
            </main>
        </div>
    );
}
