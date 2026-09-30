import { router } from '@inertiajs/react';

/**
 * Pager for a Laravel paginator prop.
 *
 * `preserveState` keeps whatever the page holds locally — a typed search term,
 * an open filter — so paging does not reset the screen under the user.
 *
 * Renders nothing when everything already fits on one page.
 */
export default function Pagination({ paginator, colorClass = 'bg-indigo-600' }) {
    if (!paginator || !paginator.total) return null;

    const { from, to, total, last_page: lastPage, links = [] } = paginator;

    return (
        <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-gray-400">
                Showing {from ?? 0}–{to ?? 0} of {total.toLocaleString()}
            </p>

            {lastPage > 1 && (
                <div className="flex items-center gap-1 flex-wrap">
                    {links.map((link, i) => (
                        <button
                            key={i}
                            disabled={!link.url || link.active}
                            onClick={() => link.url && router.get(link.url, {}, {
                                preserveState: true,
                                preserveScroll: true,
                                replace: true,
                            })}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                                link.active
                                    ? `${colorClass} text-white`
                                    : link.url
                                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        : 'text-gray-300 cursor-default'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
