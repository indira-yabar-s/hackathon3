import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { isCanceled, toApiError } from '../api/errors';
import { getWantedById } from '../api/wanted';
import { ErrorWithRetry, LoadingBlock } from '../components/AsyncStates';
import {
  FRUIT_LABEL,
  ROLE_LABEL,
  STATUS_BADGE,
  STATUS_LABEL,
  formatBerries,
  formatDate,
} from '../features/wanted/labels';
import type { ApiError, WantedDetail } from '../types/api';

// `requestKey` dice a qué request corresponde el resultado: si no coincide con la actual, está cargando
type DetailResult =
  | { requestKey: string; status: 'not-found' }
  | { requestKey: string; status: 'error'; error: ApiError }
  | { requestKey: string; status: 'success'; wanted: WantedDetail };

function cameFromList(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'fromList' in state && state.fromList === true;
}

export function WantedDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [result, setResult] = useState<DetailResult | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${id}#${reloadKey}`;
  // Loading se deriva en el render: no hace falta un setState síncrono dentro del efecto
  const state = result && result.requestKey === requestKey ? result : { status: 'loading' as const };

  // El detalle siempre empieza arriba (el listado podía estar scrolleado)
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();

    getWantedById(id, controller.signal)
      .then((wanted) => setResult({ requestKey, status: 'success', wanted }))
      .catch((error: unknown) => {
        if (isCanceled(error)) return;
        const apiError = toApiError(error);
        setResult(
          apiError.status === 404
            ? { requestKey, status: 'not-found' }
            : { requestKey, status: 'error', error: apiError },
        );
      });

    return () => controller.abort();
  }, [id, requestKey]);

  // Si vino del listado, "volver" es ir atrás en el historial: la URL trae los mismos filtros y página
  function goBack() {
    if (cameFromList(location.state)) navigate(-1);
    else navigate('/wanted');
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={goBack} className="text-sm font-medium text-amber-400 hover:underline">
        ← Volver al listado
      </button>

      {state.status === 'loading' && <LoadingBlock label="Cargando cartel…" />}

      {state.status === 'error' && (
        <ErrorWithRetry message={state.error.message} onRetry={() => setReloadKey((n) => n + 1)} />
      )}

      {state.status === 'not-found' && (
        <div className="rounded-xl border border-dashed border-slate-600 p-10 text-center">
          <p className="text-lg font-semibold text-slate-200">Cartel no encontrado</p>
          <p className="mt-1 text-slate-400">No existe un cartel con ese identificador en tu workspace.</p>
          <Link to="/wanted" className="mt-4 inline-block text-amber-400 hover:underline">
            Ir al listado
          </Link>
        </div>
      )}

      {state.status === 'success' && <WantedDetailView wanted={state.wanted} />}
    </div>
  );
}

function WantedDetailView({ wanted }: { wanted: WantedDetail }) {
  return (
    <article className="space-y-4">
      <header className="rounded-xl border border-slate-700 bg-slate-800/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-widest text-amber-400 uppercase">Se busca</p>
            <h1 className="text-3xl font-black text-slate-100">{wanted.name}</h1>
            <p className="text-lg text-slate-300">«{wanted.epithet}»</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${STATUS_BADGE[wanted.status]}`}>
            {STATUS_LABEL[wanted.status]}
          </span>
        </div>
        <p className="mt-4 text-3xl font-bold text-amber-300">{formatBerries(wanted.bounty)}</p>
        <p className="mt-1 text-slate-400" aria-label={`Nivel de amenaza ${wanted.threatLevel} de 5`}>
          Amenaza: {'●'.repeat(wanted.threatLevel)}
          <span className="text-slate-600">{'●'.repeat(Math.max(0, 5 - wanted.threatLevel))}</span>
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <dl className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/60 p-5 text-slate-200">
          <Row label="Tripulación">
            <Link to={`/wanted?crewId=${encodeURIComponent(wanted.crew.id)}`} className="text-amber-400 hover:underline">
              {wanted.crew.name}
            </Link>
          </Row>
          <Row label="Puesto">{ROLE_LABEL[wanted.role]}</Row>
          <Row label="Fruta del diablo">
            {wanted.devilFruit ? `${wanted.devilFruit.name} (${FRUIT_LABEL[wanted.devilFruit.type]})` : FRUIT_LABEL.NONE}
          </Row>
          <Row label="Edad">{wanted.age} años</Row>
          <Row label="Altura">{wanted.heightCm} cm</Row>
          <Row label="Visto por última vez">
            {wanted.lastSeen.island} · {formatDate(wanted.lastSeen.seenAt)}
          </Row>
        </dl>

        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">Historia</h2>
          <p className="leading-relaxed text-slate-200">{wanted.bio}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">Historial de recompensas</h2>
        <ol className="space-y-1">
          {wanted.bountyHistory.map((entry, index) => (
            <li key={`${entry.issuedAt}-${index}`} className="flex justify-between text-slate-200">
              <span className="text-slate-400">{formatDate(entry.issuedAt)}</span>
              <span className="font-semibold">{formatBerries(entry.amount)}</span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
