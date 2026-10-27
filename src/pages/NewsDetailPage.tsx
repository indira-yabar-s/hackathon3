import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isCanceled, toApiError } from '../api/errors';
import { getNewsById, updateNewsStatus } from '../api/news';
import { ErrorWithRetry, GrandLineLocked, LoadingBlock } from '../components/AsyncStates';
import {
  NEWS_PRIORITY_BADGE,
  NEWS_PRIORITY_LABEL,
  NEWS_STATUS_BADGE,
  NEWS_STATUS_LABEL,
  NEWS_TYPE_LABEL,
  formatDateTime,
} from '../features/news/params';
import { notifyNewsUpdated } from '../hooks/useNewsFeed';
import type { ApiError, NewsDetail, VerifiedNewsStatus } from '../types/api';

// ── /news/:id abierto desde el feed: modal encima del feed (que sigue montado detrás) ──
export function NewsDetailModal() {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // el feed de atrás no se mueve
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        navigate(-1);
        return;
      }
      // Tab no sale del modal: el foco circula entre sus elementos
      const dialog = dialogRef.current;
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [navigate]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8"
      onClick={(event) => {
        if (event.target === event.currentTarget) navigate(-1);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-detail-title"
        tabIndex={-1}
        className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl outline-none"
      >
        <NewsDetailContent onClose={() => navigate(-1)} closeLabel="Cerrar" />
      </div>
    </div>
  );
}

// ── /news/:id abierto directo (link compartido o recarga sin feed detrás) ──
export function NewsDetailPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl">
      <NewsDetailContent onClose={() => navigate('/news')} closeLabel="← Ir al feed" />
    </div>
  );
}

type DetailResult =
  | { requestKey: string; status: 'success'; news: NewsDetail }
  | { requestKey: string; status: 'error'; error: ApiError };

type VerifyState =
  | { phase: 'idle' }
  | { phase: 'pending'; target: VerifiedNewsStatus }
  | { phase: 'done'; message: string }
  | { phase: 'error'; target: VerifiedNewsStatus; error: ApiError };

function NewsDetailContent({ onClose, closeLabel }: { onClose: () => void; closeLabel: string }) {
  const { id = '' } = useParams();
  const [result, setResult] = useState<DetailResult | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [verify, setVerify] = useState<VerifyState>({ phase: 'idle' });
  const requestKey = `${id}#${reloadKey}`;
  const state = result && result.requestKey === requestKey ? result : { status: 'loading' as const };

  useEffect(() => {
    const controller = new AbortController();
    getNewsById(id, controller.signal)
      .then((news) => setResult({ requestKey, status: 'success', news }))
      .catch((error: unknown) => {
        if (isCanceled(error)) return;
        setResult({ requestKey, status: 'error', error: toApiError(error) });
      });
    return () => controller.abort();
  }, [id, requestKey]);

  function applyNews(news: NewsDetail) {
    setResult({ requestKey, status: 'success', news });
    notifyNewsUpdated(news); // el feed (si está detrás) se actualiza sin volver a pedir
  }

  // No optimista: el estado solo cambia cuando el servidor confirma
  function verifyAs(target: VerifiedNewsStatus) {
    if (verify.phase === 'pending') return;
    setVerify({ phase: 'pending', target });
    updateNewsStatus(id, target)
      .then((news) => {
        applyNews(news);
        setVerify({ phase: 'done', message: `Listo: la noticia quedó marcada como ${NEWS_STATUS_LABEL[news.status].toLowerCase()}.` });
      })
      .catch((error: unknown) => {
        const apiError = toApiError(error);
        if (apiError.code === 'NEWS_ALREADY_VERIFIED' && apiError.current) {
          // Otro integrante ya la verificó: mostramos el estado real
          applyNews(apiError.current);
          setVerify({
            phase: 'done',
            message: `Esta noticia ya había sido verificada como ${NEWS_STATUS_LABEL[apiError.current.status].toLowerCase()}.`,
          });
          return;
        }
        // Se conserva el estado anterior (sigue siendo rumor) y se puede reintentar
        setVerify({ phase: 'error', target, error: apiError });
      });
  }

  return (
    <article className="space-y-4">
      <button type="button" onClick={onClose} className="text-sm font-medium text-amber-400 hover:underline">
        {closeLabel}
      </button>

      {state.status === 'loading' && <LoadingBlock label="Cargando noticia…" />}

      {state.status === 'error' &&
        (state.error.code === 'LOG_POSE_REQUIRED' ? (
          <GrandLineLocked />
        ) : state.error.status === 404 ? (
          <div className="rounded-xl border border-dashed border-slate-600 p-10 text-center">
            <p id="news-detail-title" className="text-lg font-semibold text-slate-200">
              Noticia no encontrada
            </p>
            <p className="mt-1 text-slate-400">No existe una noticia con ese identificador en tu workspace.</p>
          </div>
        ) : (
          <ErrorWithRetry message={state.error.message} onRetry={() => setReloadKey((n) => n + 1)} />
        ))}

      {state.status === 'success' && (
        <>
          <header>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ${NEWS_STATUS_BADGE[state.news.status]}`}>
                {NEWS_STATUS_LABEL[state.news.status]}
              </span>
              <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ${NEWS_PRIORITY_BADGE[state.news.priority]}`}>
                Prioridad {NEWS_PRIORITY_LABEL[state.news.priority].toLowerCase()}
              </span>
              <span className="text-slate-400">{NEWS_TYPE_LABEL[state.news.type]}</span>
            </div>
            <h1 id="news-detail-title" className="text-2xl font-bold text-slate-100">
              {state.news.title}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {state.news.source} · {state.news.island} · {formatDateTime(state.news.publishedAt)}
            </p>
          </header>

          <p className="font-medium text-slate-200">{state.news.summary}</p>
          {state.news.body.map((paragraph, index) => (
            <p key={index} className="leading-relaxed text-slate-300">
              {paragraph}
            </p>
          ))}

          {state.news.relatedWanted && (
            <p className="text-sm text-slate-400">
              Cartel relacionado:{' '}
              <Link to={`/wanted/${encodeURIComponent(state.news.relatedWanted.id)}`} className="text-amber-400 hover:underline">
                {state.news.relatedWanted.name}
              </Link>
            </p>
          )}

          <section aria-label="Verificación" className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            {state.news.status === 'RUMOR' ? (
              <>
                <p className="mb-3 text-sm text-slate-300">¿La Guild puede verificar este rumor?</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={verify.phase === 'pending'}
                    onClick={() => verifyAs('CONFIRMED')}
                    className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verify.phase === 'pending' && verify.target === 'CONFIRMED' ? 'Confirmando…' : 'Confirmar'}
                  </button>
                  <button
                    type="button"
                    disabled={verify.phase === 'pending'}
                    onClick={() => verifyAs('DEBUNKED')}
                    className="rounded-lg bg-rose-500 px-4 py-2 font-semibold text-white hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verify.phase === 'pending' && verify.target === 'DEBUNKED' ? 'Desmintiendo…' : 'Desmentir'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-300">
                Verificada como <strong>{NEWS_STATUS_LABEL[state.news.status].toLowerCase()}</strong>
                {state.news.verifiedAt && ` el ${formatDateTime(state.news.verifiedAt)}`}.
              </p>
            )}

            <div aria-live="polite" className="mt-3 empty:hidden">
              {verify.phase === 'done' && <p className="text-sm text-emerald-300">{verify.message}</p>}
              {verify.phase === 'error' && (
                <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-200">
                  <span>
                    No se pudo marcar como {NEWS_STATUS_LABEL[verify.target].toLowerCase()}: {verify.error.message} La
                    noticia sigue como rumor.
                  </span>
                  <button
                    type="button"
                    onClick={() => verifyAs(verify.target)}
                    className="rounded-lg bg-red-500 px-3 py-1.5 font-semibold text-white hover:bg-red-400"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </article>
  );
}
