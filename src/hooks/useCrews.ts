import { useCallback, useEffect, useState } from 'react';
import { getCrews } from '../api/crews';
import { isCanceled } from '../api/errors';
import { crewsCache } from '../features/wanted/cache';
import type { Crew } from '../types/api';

type CrewsState = { status: 'loading' | 'error'; crews: null } | { status: 'success'; crews: Crew[] };

// Opciones del filtro "tripulación" (GET /crews), pedidas una sola vez por sesión
export function useCrews() {
  const [state, setState] = useState<CrewsState>(() => {
    const cached = crewsCache.get();
    return cached ? { status: 'success', crews: cached } : { status: 'loading', crews: null };
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (crewsCache.get()) return;

    const controller = new AbortController();
    getCrews(controller.signal)
      .then((crews) => {
        crewsCache.set(crews);
        setState({ status: 'success', crews });
      })
      .catch((error: unknown) => {
        if (isCanceled(error)) return;
        setState({ status: 'error', crews: null });
      });

    return () => controller.abort();
  }, [reloadKey]);

  const retry = useCallback(() => {
    setState({ status: 'loading', crews: null });
    setReloadKey((n) => n + 1);
  }, []);

  return { ...state, retry };
}
