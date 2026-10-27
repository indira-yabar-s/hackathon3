import { useEffect, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { isCanceled, toApiError } from '../api/errors';
import { getSagas } from '../api/sagas';
import { EmptyState, ErrorWithRetry, GrandLineLocked, LoadingBlock } from '../components/AsyncStates';
import { formatNumber } from '../features/wanted/labels';
import { transitionName, useViewTransitionNavigate } from '../hooks/useMotion';
import type { ApiError, SagaSummary } from '../types/api';

type SagasState =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'success'; sagas: SagaSummary[] };

// /sagas: resumen de las sagas. Cada tarjeta abre su historia con View Transition (si hay soporte).
export function SagasPage() {
  const [state, setState] = useState<SagasState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const navigateWithTransition = useViewTransitionNavigate();

  useEffect(() => {
    const controller = new AbortController();
    getSagas(controller.signal)
      .then((sagas) => setState({ status: 'success', sagas }))
      .catch((error: unknown) => {
        if (isCanceled(error)) return;
        setState({ status: 'error', error: toApiError(error) });
      });
    return () => controller.abort();
  }, [reloadKey]);

  function openSaga(event: MouseEvent<HTMLAnchorElement>, saga: SagaSummary) {
    // Ctrl/Cmd/Shift + clic o clic central: comportamiento normal del link (nueva pestaña, etc.)
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    // El resumen viaja en el state: la historia pinta su título al instante (la transición lo "mueve")
    navigateWithTransition(`/sagas/${encodeURIComponent(saga.id)}`, { state: { saga } });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">Poneglyph · La Gran Saga</h1>
        <p className="text-slate-400">Elige una saga y recorre su ruta por el Grand Line.</p>
      </header>

      {state.status === 'loading' && <LoadingBlock label="Leyendo los Poneglyphs…" />}

      {state.status === 'error' &&
        (state.error.code === 'LOG_POSE_REQUIRED' ? (
          <GrandLineLocked />
        ) : (
          <ErrorWithRetry
            message={state.error.message}
            onRetry={() => {
              setState({ status: 'loading' });
              setReloadKey((n) => n + 1);
            }}
          />
        ))}

      {state.status === 'success' && state.sagas.length === 0 && (
        <EmptyState title="Sin sagas" description="Todavía no hay sagas disponibles para tu tripulación." />
      )}

      {state.status === 'success' && state.sagas.length > 0 && (
        <ol className="grid gap-4 md:grid-cols-2">
          {state.sagas.map((saga) => (
            <li key={saga.id}>
              <Link
                to={`/sagas/${encodeURIComponent(saga.id)}`}
                state={{ saga }}
                onClick={(event) => openSaga(event, saga)}
                className="block h-full rounded-2xl border p-5 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                style={{ backgroundColor: saga.palette.background, borderColor: saga.palette.surface, color: saga.palette.text }}
              >
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: saga.palette.accent }}>
                  Saga {saga.order}
                </p>
                <h2
                  className="mt-1 text-xl font-bold"
                  style={{ color: saga.palette.primary, viewTransitionName: transitionName('saga-title', saga.id) }}
                >
                  {saga.title}
                </h2>
                <p className="mt-1 font-medium opacity-90">{saga.subtitle}</p>
                <p className="mt-3 text-sm opacity-80">{saga.synopsis}</p>
                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <div className="flex gap-1">
                    <dt className="opacity-70">Etapas:</dt>
                    <dd className="font-semibold">{saga.stageCount}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="opacity-70">Distancia:</dt>
                    <dd className="font-semibold">{formatNumber(saga.totalDistanceNm)} mn</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="opacity-70">Ruta:</dt>
                    <dd className="font-semibold">
                      {saga.firstIsland} → {saga.lastIsland}
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
