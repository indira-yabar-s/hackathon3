import { useCallback, useEffect, useRef, useState } from 'react';
import { isCanceled, toApiError } from '../api/errors';
import { getNewsFeed } from '../api/news';
import { newsFiltersKey, parseNewsFilters } from '../features/news/params';
import type { ApiError, NewsFilters, NewsItem } from '../types/api';

// ── Avisos de "esta noticia cambió" (verificación en el detalle → el feed la actualiza) ──
type NewsListener = (news: NewsItem) => void;
const listeners = new Set<NewsListener>();

export function notifyNewsUpdated(news: NewsItem): void {
  listeners.forEach((listener) => listener(news));
}

// ── Estado del feed ──
interface FeedState {
  key: string; // a qué filtros pertenece este estado
  items: NewsItem[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean; // carga inicial o adicional en vuelo
  error: ApiError | null; // error de la última carga (las noticias ya cargadas se conservan)
}

const initialState = (key: string): FeedState => ({
  key,
  items: [],
  nextCursor: null,
  hasMore: true,
  loading: true,
  error: null,
});

// Regla de Nami: una noticia nunca aparece dos veces, aunque el servidor la repita
function appendUnique(current: NewsItem[], incoming: NewsItem[]): NewsItem[] {
  const seen = new Set(current.map((item) => item.id));
  const fresh: NewsItem[] = [];
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      fresh.push(item);
    }
  }
  return fresh.length > 0 ? [...current, ...fresh] : current;
}

export function useNewsFeed(filters: NewsFilters) {
  const key = newsFiltersKey(filters);
  const [state, setState] = useState<FeedState>(() => initialState(key));
  // Si los filtros cambiaron, lo que hay en `state` es de otro feed: se muestra el feed nuevo vacío
  const current = state.key === key ? state : initialState(key);

  // Una sola carga en vuelo: el controller de la request activa (null = ninguna)
  const inFlightRef = useRef<AbortController | null>(null);
  const stateRef = useRef(current);
  useEffect(() => {
    stateRef.current = current;
  });

  const load = useCallback(
    (cursor: string | null) => {
      if (inFlightRef.current) return; // ya hay una carga en vuelo
      const controller = new AbortController();
      inFlightRef.current = controller;
      const requestKey = key;

      setState((prev) => {
        const base = prev.key === requestKey ? prev : initialState(requestKey);
        return { ...base, loading: true, error: null };
      });

      getNewsFeed(parseNewsFilters(new URLSearchParams(requestKey)), cursor, controller.signal)
        .then((feed) => {
          setState((prev) => {
            // Regla del Log Pose: si los filtros cambiaron, esta respuesta ya no se pinta
            if (prev.key !== requestKey) return prev;
            return {
              ...prev,
              items: appendUnique(cursor ? prev.items : [], feed.items),
              nextCursor: feed.nextCursor,
              hasMore: feed.hasMore && feed.nextCursor !== null,
              loading: false,
              error: null,
            };
          });
        })
        .catch((error: unknown) => {
          if (isCanceled(error)) return;
          const apiError = toApiError(error);
          setState((prev) => (prev.key === requestKey ? { ...prev, loading: false, error: apiError } : prev));
        })
        .finally(() => {
          if (inFlightRef.current === controller) inFlightRef.current = null;
        });
    },
    [key],
  );

  // Cambio de filtros → se cancela la carga anterior y se empieza de cero, sin cursor
  useEffect(() => {
    load(null);
    return () => {
      inFlightRef.current?.abort();
      inFlightRef.current = null;
    };
  }, [load]);

  // Carga adicional: solo si hay más, no hay otra en vuelo y la anterior no falló
  const loadMore = useCallback(() => {
    const { hasMore, nextCursor, error, loading, items } = stateRef.current;
    if (!hasMore || loading || error || items.length === 0) return;
    load(nextCursor);
  }, [load]);

  // Reintento tras un error: si ya había noticias, continúa desde el último cursor (no las borra)
  const retry = useCallback(() => {
    const { items, nextCursor, error } = stateRef.current;
    const cursorRejected = error?.code === 'INVALID_CURSOR' || error?.code === 'CURSOR_FILTER_MISMATCH';
    if (items.length > 0 && !cursorRejected) {
      load(nextCursor);
    } else {
      setState(initialState(key));
      load(null);
    }
  }, [key, load]);

  // Una noticia verificada en el detalle se refleja aquí. Si ya no cumple el filtro de estado, sale.
  useEffect(() => {
    const onUpdate: NewsListener = (news) => {
      setState((prev) => {
        if (!prev.items.some((item) => item.id === news.id)) return prev;
        const statusFilter = parseNewsFilters(new URLSearchParams(prev.key)).status;
        const items =
          statusFilter && statusFilter !== news.status
            ? prev.items.filter((item) => item.id !== news.id)
            : prev.items.map((item) => (item.id === news.id ? { ...item, ...news } : item));
        return { ...prev, items };
      });
    };
    listeners.add(onUpdate);
    return () => {
      listeners.delete(onUpdate);
    };
  }, []);

  return { ...current, loadMore, retry };
}
