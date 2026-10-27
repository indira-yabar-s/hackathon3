import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorWithRetry, GrandLineLocked, LoadingBlock, Spinner } from '../components/AsyncStates';
import {
  NEWS_PRIORITIES,
  NEWS_PRIORITY_BADGE,
  NEWS_PRIORITY_LABEL,
  NEWS_STATUSES,
  NEWS_STATUS_BADGE,
  NEWS_STATUS_LABEL,
  NEWS_TYPES,
  NEWS_TYPE_LABEL,
  formatDateTime,
  newsFiltersKey,
  parseNewsFilters,
  serializeNewsFilters,
} from '../features/news/params';
import { useNewsFeed } from '../hooks/useNewsFeed';
import type { NewsFilters, NewsItem } from '../types/api';

const selectClass =
  'w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-amber-400';

function pick<T extends string>(allowed: readonly T[], value: string): T | undefined {
  return allowed.find((option) => option === value);
}

export function NewsFeedPage() {
  // ── Filtros: viven en la URL (recargar o compartir muestra el mismo feed) ──
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseNewsFilters(searchParams), [searchParams]);
  const key = newsFiltersKey(filters);
  const location = useLocation();

  const { items, hasMore, loading, error, loadMore, retry } = useNewsFeed(filters);

  // URL con valores inválidos (?type=xyz): se reescribe limpia, sin agregar historial
  useEffect(() => {
    if (searchParams.toString() !== key) setSearchParams(new URLSearchParams(key), { replace: true });
  }, [searchParams, key, setSearchParams]);

  function updateFilters(patch: Partial<NewsFilters>) {
    setSearchParams(serializeNewsFilters({ ...filters, ...patch }));
  }

  // Al cambiar de filtros el feed empieza de cero: volvemos arriba
  const previousKeyRef = useRef(key);
  useEffect(() => {
    if (previousKeyRef.current !== key) {
      previousKeyRef.current = key;
      window.scrollTo(0, 0);
    }
  }, [key]);

  // ── Infinite scroll: cuando el centinela del final se acerca a la pantalla, se pide la siguiente carga ──
  // El observer se recrea tras cada carga: si el centinela sigue visible (pantalla sin llenar), pide otra.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || error || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, hasMore, error, loading, loadMore]);

  const locked = error?.code === 'LOG_POSE_REQUIRED';
  const firstLoad = items.length === 0;
  const hasFilters = Boolean(filters.type || filters.priority || filters.status);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">Noticias del mundo</h1>
        <p className="text-slate-400">Lo que traen las gaviotas mensajeras, de lo más reciente a lo más antiguo.</p>
      </header>

      <section
        aria-label="Filtros"
        className="sticky top-0 z-10 grid gap-3 rounded-xl border border-slate-700 bg-slate-900/95 p-4 backdrop-blur sm:grid-cols-4"
      >
        <div>
          <label htmlFor="news-type" className="mb-1 block text-sm text-slate-400">
            Tipo
          </label>
          <select
            id="news-type"
            value={filters.type ?? ''}
            onChange={(event) => updateFilters({ type: pick(NEWS_TYPES, event.target.value) })}
            className={selectClass}
          >
            <option value="">Todos</option>
            {NEWS_TYPES.map((type) => (
              <option key={type} value={type}>
                {NEWS_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="news-priority" className="mb-1 block text-sm text-slate-400">
            Prioridad
          </label>
          <select
            id="news-priority"
            value={filters.priority ?? ''}
            onChange={(event) => updateFilters({ priority: pick(NEWS_PRIORITIES, event.target.value) })}
            className={selectClass}
          >
            <option value="">Todas</option>
            {NEWS_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {NEWS_PRIORITY_LABEL[priority]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="news-status" className="mb-1 block text-sm text-slate-400">
            Estado
          </label>
          <select
            id="news-status"
            value={filters.status ?? ''}
            onChange={(event) => updateFilters({ status: pick(NEWS_STATUSES, event.target.value) })}
            className={selectClass}
          >
            <option value="">Todos</option>
            {NEWS_STATUSES.map((status) => (
              <option key={status} value={status}>
                {NEWS_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          {hasFilters && (
            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams())}
              className="py-2 text-sm font-medium text-amber-400 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </section>

      {locked ? (
        <GrandLineLocked />
      ) : firstLoad && error ? (
        <ErrorWithRetry message={error.message} onRetry={retry} />
      ) : firstLoad && loading ? (
        <LoadingBlock label="Cargando noticias…" />
      ) : firstLoad && !hasMore ? (
        <EmptyState title="Sin noticias" description="Ninguna noticia coincide con estos filtros." />
      ) : (
        <>
          <ol className="space-y-3" aria-label="Noticias">
            {items.map((news) => (
              <li key={news.id}>
                <NewsCard news={news} background={location} />
              </li>
            ))}
          </ol>

          {/* Pie del feed: carga en vuelo, error recuperable o fin de la lista */}
          <div ref={sentinelRef} className="flex min-h-20 items-center justify-center" aria-live="polite">
            {loading && (
              <span className="flex items-center gap-3 text-slate-300">
                <Spinner /> Cargando más noticias…
              </span>
            )}
            {!loading && error && (
              <div role="alert" className="flex flex-wrap items-center justify-center gap-3 text-red-200">
                <span>{error.message}</span>
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-400"
                >
                  Reintentar
                </button>
              </div>
            )}
            {!loading && !error && !hasMore && <span className="text-slate-500">No hay más noticias.</span>}
          </div>
        </>
      )}
    </div>
  );
}

function NewsCard({ news, background }: { news: NewsItem; background: ReturnType<typeof useLocation> }) {
  return (
    <Link
      to={`/news/${encodeURIComponent(news.id)}`}
      // El feed queda montado detrás del detalle (modal): al cerrarlo conserva posición y noticias
      state={{ background }}
      className="block rounded-xl border border-slate-700 bg-slate-800/50 p-4 hover:border-slate-500 hover:bg-slate-800"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ${NEWS_STATUS_BADGE[news.status]}`}>
          {NEWS_STATUS_LABEL[news.status]}
        </span>
        <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ${NEWS_PRIORITY_BADGE[news.priority]}`}>
          Prioridad {NEWS_PRIORITY_LABEL[news.priority].toLowerCase()}
        </span>
        <span className="text-slate-400">{NEWS_TYPE_LABEL[news.type]}</span>
      </div>
      <h2 className="font-semibold text-slate-100">{news.title}</h2>
      <p className="mt-1 text-sm text-slate-300">{news.summary}</p>
      <p className="mt-2 text-xs text-slate-500">
        {news.source} · {news.island} · {formatDateTime(news.publishedAt)}
      </p>
    </Link>
  );
}
