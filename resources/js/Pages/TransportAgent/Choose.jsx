import { Head, Link } from '@inertiajs/react';

const ICON = {
    bike_maruwa: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="6" cy="17" r="3" strokeWidth="1.8" />
            <circle cx="18" cy="17" r="3" strokeWidth="1.8" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17h6l-3-7H8m6 0h3" />
        </svg>
    ),
    korobe_bus: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                d="M4 16v2a1 1 0 001 1h1a1 1 0 001-1v-2m10 0v2a1 1 0 001 1h1a1 1 0 001-1v-2M5 16h14a1 1 0 001-1v-4l-2-5H6L4 10v5a1 1 0 001 1z" />
        </svg>
    ),
};

export default function Choose({ categories = {} }) {
    return (
        <>
            <Head title="Transport Agent Registration" />

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900 to-orange-900 py-12 px-4">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -left-32 w-96 h-96 bg-amber-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />
                    <div className="absolute -bottom-40 -right-32 w-96 h-96 bg-orange-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1.5s' }} />
                </div>

                <div className="relative z-10 max-w-xl mx-auto">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-2xl mb-4 rotate-3">
                            <svg className="w-8 h-8 text-amber-600 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                                    d="M8 17h8m-8 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m12 0a2 2 0 104 0m-4 0a2 2 0 114 0M3 6h13v11H3V6zm13 4h3.5L22 13v4h-6v-7z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg tracking-tight">
                            Transport Agent Registration
                        </h1>
                        <p className="text-white/70 mt-3 text-sm">
                            Which do you register? Pick the one you work — it decides what you capture in the field.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {Object.entries(categories).map(([key, category]) => (
                            <Link key={key} href={route('transport-agent.create', category.slug)}
                                className="group flex items-center gap-4 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl px-5 py-5 hover:bg-white transition">
                                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                    {ICON[key]}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-gray-800">{category.label}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Also called {category.also}</p>
                                </div>
                                <svg className="w-5 h-5 text-gray-300 group-hover:text-amber-600 shrink-0 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        ))}
                    </div>

                    <p className="text-center mt-6">
                        <a href={route('transport-agent.login')} className="text-sm text-white/70 hover:text-white hover:underline">
                            Already registered? Log in
                        </a>
                    </p>
                </div>
            </div>
        </>
    );
}
