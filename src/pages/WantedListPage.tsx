import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigationType, useSearchParams } from 'react-router-dom';
import { ErrorWithRetry } from '../components/AsyncStates';
import { Pagination } from '../components/wanted/Pagination';
import { WantedFilters } from '../components/wanted/WantedFilters';
import { WantedList, WantedListMessage, WantedListSkeleton } from '../components/wanted/WantedList';
import { wantedScrollPositions } from '../features/wanted/cache';
import { formatNumber } from '../features/wanted/labels';
import {
  DEFAULT_WANTED_QUERY,
  normalizeSearch,
  parseWantedParams,
  serializeWantedQuery,
  wantedQueryKey,
} from '../features/wanted/params';
import { useCrews } from '../hooks/useCrews';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useWantedPage } from '../hooks/useWantedPage';
import type { WantedQuery } from '../types/api';

const SEARCH_DEBOUNCE_MS = 400;

export function WantedListPage() {
  // ── La URL es la única fuente de verdad del estado del listado ──
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseWantedParams(searchParams), [searchParams]);
  const key = wantedQueryKey(query);
  const navigationType = useNavigationType();

  const { status, data, error, isStale, retry } = useWantedPage(query, {
    preferCache: navigationType === 'POP', // atrás/adelante: pintar lo que ya teníamos
  });
  const crewOptions = useCrews();

  // Cambiar filtros/orden/tamaño vuelve a la página 0 (nunca quedar en una página que ya no existe).
  // Cada cambio es una entrada del historial: atrás/adelante lo deshace/rehace.
  const updateQuery = useCallback(
    (patch: Partial<WantedQuery>, options: { replace?: boolean; keepPage?: boolean } = {}) => {
      setSearchParams(
        (prev) => {
          const current = parseWantedParams(prev);
          const page = options.keepPage ? (patch.page ?? current.page) : 0;
          return serializeWantedQuery({ ...current, ...patch, page });
        },
        { replace: options.replace ?? false },
      );
    },
    [setSearchParams],
  );

  // ── URL inválida (?size=999&page=-1&sort=x): se reescribe con valores válidos ──
  useEffect(() => {
    if (searchParams.toString() !== key) {
      setSearchParams(serializeWantedQuery(query), { replace: true });
    }
  }, [searchParams, key, query, setSearchParams]);

  // ── Búsqueda con debounce: solo se escribe en la URL cuando el usuario deja de tipear ──
  const [searchInput, setSearchInput] = useState(query.q ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  // Debe reaccionar SOLO cuando cambia el valor debounced (no cuando la URL cambia por atrás/adelante),
  // así que el q actual y updateQuery se leen desde una ref con su última versión.
  const latestRef = useRef({ q: query.q, updateQuery });
  useEffect(() => {
    latestRef.current = { q: query.q, updateQuery };
  });

  useEffect(() => {
    const next = normalizeSearch(debouncedSearch);
    if (next !== latestRef.current.q) latestRef.current.updateQuery({ q: next });
  }, [debouncedSearch]);

  // Si la URL cambia por atrás/adelante, el input se sincroniza (ajuste durante el render, sin efecto)
  const [lastUrlSearch, setLastUrlSearch] = useState(query.q);
  if (query.q !== lastUrlSearch) {
    setLastUrlSearch(query.q);
    if (normalizeSearch(searchInput) !== query.q) setSearchInput(query.q ?? '');
  }

  // ── Página fuera de rango (URL vieja o compartida): ir a la última página que sí existe ──
  useEffect(() => {
    if (status !== 'success' || !data || isStale) return;
    if (data.totalPages > 0 && query.page >= data.totalPages) {
      updateQuery({ page: data.totalPages - 1 }, { replace: true, keepPage: true });
    } else if (data.totalPages === 0 && query.page > 0) {
      updateQuery({ page: 0 }, { replace: true, keepPage: true });
    }
  }, [status, data, isStale, query.page, updateQuery]);

  // ── Scroll: se guarda mientras el usuario navega la lista y se restaura al volver del detalle ──
  const leavingRef = useRef(false);
  useEffect(() => {
    leavingRef.current = false;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!leavingRef.current) wantedScrollPositions.set(key, window.scrollY);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [key]);

  const restoredRef = useRef(false);
  useLayoutEffect(() => {
    if (restoredRef.current) return;
    if (navigationType !== 'POP') {
      restoredRef.current = true;
      return;
    }
    if (status === 'success' && !isStale) {
      const saved = wantedScrollPositions.get(key);
      if (saved !== undefined) window.scrollTo(0, saved);
      restoredRef.current = true;
    }
  }, [navigationType, status, isStale, key]);

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(serializeWantedQuery({ ...DEFAULT_WANTED_QUERY, sort: query.sort, size: query.size }));
  };

  // ── Qué se muestra en el contenedor de resultados ──
  const showData = data !== null && status !== 'error';
  const pageOutOfRange = data !== null && data.content.length === 0 && data.totalElements > 0;

  let results: ReactNode;
  if (status === 'error' && error) {
    results = (
      <WantedListMessage>
        <ErrorWithRetry message={error.message} onRetry={retry} />
      </WantedListMessage>
    );
  } else if (!showData) {
    results = <WantedListSkeleton rows={query.size} />;
  } else if (data.totalElements === 0 && !isStale) {
    results = (
      <WantedListMessage>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-200">Sin resultados</p>
          <p className="mt-1 text-slate-400">Ningún cartel coincide con estos filtros.</p>
        </div>
      </WantedListMessage>
    );
  } else {
    results = (
      <WantedList
        items={data.content}
        loading={status === 'loading' || isStale || pageOutOfRange}
        onOpenDetail={() => {
          leavingRef.current = true;
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Carteles de «Se Busca»</h1>
          <p className="text-slate-400" aria-live="polite">
            {data ? `${formatNumber(data.totalElements)} carteles encontrados` : 'Buscando carteles…'}
          </p>
        </div>
      </header>

      <WantedFilters
        query={query}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onChange={(patch) => updateQuery(patch)}
        onClear={clearFilters}
        crewOptions={crewOptions}
      />

      {results}

      <Pagination
        page={query.page}
        totalPages={data?.totalPages ?? 0}
        disabled={!data || status === 'loading'}
        onPageChange={(page) => updateQuery({ page }, { keepPage: true })}
      />
    </div>
  );
}
