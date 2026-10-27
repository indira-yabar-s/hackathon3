import { useCallback, useEffect, useRef, useState } from 'react';
import { isCanceled, toApiError } from '../api/errors';
import { getWanted } from '../api/wanted';
import { wantedPageCache } from '../features/wanted/cache';
import { parseWantedParams, wantedQueryKey } from '../features/wanted/params';
import type { ApiError, WantedPage, WantedQuery } from '../types/api';

interface WantedPageState {
  status: 'loading' | 'success' | 'error';
  data: WantedPage | null; // se conserva la última respuesta mientras carga la siguiente (layout estable)
  dataKey: string | null; // a qué consulta corresponde `data`
  error: ApiError | null;
}

interface Options {
  // true al volver con atrás/adelante: si la consulta ya está en caché, no se vuelve a pedir
  preferCache: boolean;
}

export function useWantedPage(query: WantedQuery, { preferCache }: Options) {
  // La clave resume toda la consulta: si cambia cualquier filtro, cambia la clave
  const key = wantedQueryKey(query);

  const [state, setState] = useState<WantedPageState>(() => {
    const cached = preferCache ? wantedPageCache.get(key) : undefined;
    return cached
      ? { status: 'success', data: cached, dataKey: key, error: null }
      : { status: 'loading', data: null, dataKey: null, error: null };
  });
  const [reloadKey, setReloadKey] = useState(0);

  // preferCache se lee al momento de pedir, pero no debe disparar una request nueva por sí solo
  const preferCacheRef = useRef(preferCache);
  const forceRefreshRef = useRef(false);
  useEffect(() => {
    preferCacheRef.current = preferCache;
  });

  useEffect(() => {
    const useCache = preferCacheRef.current && !forceRefreshRef.current;
    forceRefreshRef.current = false;

    const cached = useCache ? wantedPageCache.get(key) : undefined;
    if (cached) {
      setState({ status: 'success', data: cached, dataKey: key, error: null });
      return;
    }

    // Regla del Log Pose: si la consulta cambia antes de que responda, el cleanup cancela
    // esta request y su respuesta nunca se pinta.
    const controller = new AbortController();
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    getWanted(parseWantedParams(new URLSearchParams(key)), controller.signal)
      .then((page) => {
        wantedPageCache.set(key, page);
        setState({ status: 'success', data: page, dataKey: key, error: null });
      })
      .catch((error: unknown) => {
        if (isCanceled(error)) return;
        setState((prev) => ({ ...prev, status: 'error', error: toApiError(error) }));
      });

    return () => controller.abort();
  }, [key, reloadKey]);

  const retry = useCallback(() => {
    forceRefreshRef.current = true;
    setReloadKey((n) => n + 1);
  }, []);

  return {
    ...state,
    // true si `data` es de una consulta anterior (se está cargando la nueva)
    isStale: state.dataKey !== key,
    retry,
  };
}
