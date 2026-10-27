import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { isCanceled, toApiError } from '../api/errors';
import { getSagaStory } from '../api/sagas';
import { ErrorWithRetry, GrandLineLocked, LoadingBlock } from '../components/AsyncStates';
import { GrandLineMap } from '../components/GrandLineMap';
import { transitionName, usePrefersReducedMotion, useViewTransitionNavigate } from '../hooks/useMotion';
import type { ApiError, Palette, SagaStory, SagaSummary, StageMetric } from '../types/api';

type StoryResult =
  | { requestKey: string; status: 'success'; story: SagaStory }
  | { requestKey: string; status: 'error'; error: ApiError };

// El resumen que manda /sagas en location.state (para pintar el título sin esperar la request)
function sagaFromState(state: unknown): SagaSummary | null {
  if (typeof state === 'object' && state !== null && 'saga' in state) {
    const saga = state.saga;
    if (typeof saga === 'object' && saga !== null && 'id' in saga && 'title' in saga && 'palette' in saga) {
      return saga as SagaSummary;
    }
  }
  return null;
}

// Paleta → variables CSS que usa toda la historia (y el mapa)
function paletteVars(palette: Palette): CSSProperties {
  return {
    '--saga-background': palette.background,
    '--saga-surface': palette.surface,
    '--saga-primary': palette.primary,
    '--saga-accent': palette.accent,
    '--saga-text': palette.text,
  } as CSSProperties;
}

const numberFormat = new Intl.NumberFormat('es-PE');
function formatMetric(metric: StageMetric): string {
  if (metric.unit === 'berries') return `฿ ${numberFormat.format(metric.value)}`;
  if (metric.unit === '/10') return `${numberFormat.format(metric.value)}/10`;
  if (metric.unit === '%') return `${numberFormat.format(metric.value)} %`;
  return `${numberFormat.format(metric.value)} ${metric.unit}`;
}

// ── /sagas/:id ──
export function SagaStoryPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const preview = sagaFromState(location.state);
  const [result, setResult] = useState<StoryResult | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${id}#${reloadKey}`;
  const state = result && result.requestKey === requestKey ? result : { status: 'loading' as const };

  useEffect(() => {
    const controller = new AbortController();
    getSagaStory(id, controller.signal)
      .then((story) => setResult({ requestKey, status: 'success', story }))
      .catch((error: unknown) => {
        if (isCanceled(error)) return;
        setResult({ requestKey, status: 'error', error: toApiError(error) });
      });
    return () => controller.abort();
  }, [id, requestKey]);

  if (state.status === 'success') return <Story story={state.story} />;

  return (
    <div className="space-y-6">
      <BackToSagas />
      {preview && (
        <h1
          className="text-3xl font-black text-slate-100"
          style={{ viewTransitionName: transitionName('saga-title', preview.id) }}
        >
          {preview.title}
        </h1>
      )}
      {state.status === 'loading' && <LoadingBlock label="Desplegando la carta de navegación…" />}
      {state.status === 'error' &&
        (state.error.code === 'LOG_POSE_REQUIRED' ? (
          <GrandLineLocked />
        ) : state.error.status === 404 ? (
          <div className="rounded-xl border border-dashed border-slate-600 p-10 text-center">
            <p className="text-lg font-semibold text-slate-200">Saga no encontrada</p>
            <p className="mt-1 text-slate-400">No existe una saga con ese identificador en tu workspace.</p>
          </div>
        ) : (
          <ErrorWithRetry message={state.error.message} onRetry={() => setReloadKey((n) => n + 1)} />
        ))}
    </div>
  );
}

function BackToSagas() {
  const navigateWithTransition = useViewTransitionNavigate();
  return (
    <Link
      to="/sagas"
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigateWithTransition('/sagas');
      }}
      className="inline-block text-sm font-medium hover:underline"
      style={{ color: 'var(--saga-accent, #fbbf24)' }}
    >
      ← Todas las sagas
    </Link>
  );
}

// ── La historia: etapas activadas por scroll + panel fijo con mapa, métricas y progreso ──
function Story({ story }: { story: SagaStory }) {
  const { saga, map, stages } = story;
  const reducedMotion = usePrefersReducedMotion();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // La etapa inicial sale de la URL (?stage=slug); si no existe, la primera
  const [activeIndex, setActiveIndex] = useState(() => {
    const index = stages.findIndex((stage) => stage.slug === searchParams.get('stage'));
    return index >= 0 ? index : 0;
  });
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeStage = stages[activeIndex];

  // Abrir la URL de una etapa lleva directo a ella; sin etapa, la historia empieza arriba
  useLayoutEffect(() => {
    const index = stages.findIndex((stage) => stage.slug === new URLSearchParams(window.location.search).get('stage'));
    if (index > 0) sectionRefs.current[index]?.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, [stages]);

  // La URL siempre indica la etapa activa (replace: no llena el historial mientras se hace scroll).
  // Solo si seguimos en esta historia: si ya se está navegando a otra página (p. ej. con View
  // Transition), no se la pisa con una URL de esta saga.
  useEffect(() => {
    if (window.location.pathname !== pathname) return;
    const params = new URLSearchParams(window.location.search);
    const slug = stages[activeIndex].slug;
    if (params.get('stage') === slug) return;
    params.set('stage', slug);
    navigate({ pathname, search: `?${params.toString()}` }, { replace: true });
  }, [activeIndex, stages, pathname, navigate]);

  // Etapa activa = la que cruza la línea media de la pantalla
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            if (Number.isInteger(index)) setActiveIndex(index);
          }
        }
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    );
    sectionRefs.current.forEach((section) => section && observer.observe(section));
    return () => observer.disconnect();
  }, [stages]);

  // CSS Scroll-driven Animations si hay soporte; si no (o con movimiento reducido), equivalente en JS
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const supportsScrollTimeline = CSS.supports('animation-timeline: scroll()');
    const supportsViewTimeline = CSS.supports('animation-timeline: view()');
    const cleanups: (() => void)[] = [];

    // Barra de progreso de lectura: --saga-scroll (0 a 1) según el scroll de la página
    if (!supportsScrollTimeline || reducedMotion) {
      let frame = 0;
      const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        root.style.setProperty('--saga-scroll', String(max > 0 ? Math.min(1, window.scrollY / max) : 1));
      };
      const onScroll = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(update);
      };
      update();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      cleanups.push(() => {
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
    }

    // Aparición de cada etapa: view() en CSS, o IntersectionObserver que marca data-visible
    if (!supportsViewTimeline && !reducedMotion) {
      root.classList.add('saga-reveal-fallback');
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) (entry.target as HTMLElement).dataset.visible = 'true';
          }
        },
        { threshold: 0.15 },
      );
      root.querySelectorAll('.saga-stage-content').forEach((element) => observer.observe(element));
      cleanups.push(() => {
        observer.disconnect();
        root.classList.remove('saga-reveal-fallback');
      });
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [reducedMotion, stages]);

  // Ir a una etapa (botones, lista o teclado): scroll + foco en la sección, sin ocultar contenido
  const goToStage = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(stages.length - 1, index));
      const section = sectionRefs.current[target];
      if (!section) return;
      setActiveIndex(target);
      section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      section.focus({ preventScroll: true });
    },
    [reducedMotion, stages.length],
  );

  // Teclado: ← / → (también K / J) cambian de etapa, salvo que se esté escribiendo en un campo
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowRight' || event.key === 'j') {
        event.preventDefault();
        goToStage(activeIndexRef.current + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'k') {
        event.preventDefault();
        goToStage(activeIndexRef.current - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goToStage]);

  // Toda la página toma el color de fondo de la etapa activa (se restaura al salir)
  useEffect(() => {
    const body = document.body.style;
    const previous = { background: body.backgroundColor, transition: body.transition };
    body.backgroundColor = activeStage.palette.background;
    body.transition = reducedMotion ? 'none' : 'background-color 0.7s ease';
    return () => {
      body.backgroundColor = previous.background;
      body.transition = previous.transition;
    };
  }, [activeStage.palette.background, reducedMotion]);

  const distance = activeStage.metrics.find((metric) => metric.key === 'distanceNm');

  return (
    <div
      ref={rootRef}
      style={paletteVars(activeStage.palette)}
      className="saga-story -mx-4 -my-6 bg-[var(--saga-background)] px-4 py-6 text-[var(--saga-text)] transition-colors duration-700 motion-reduce:transition-none sm:mx-0 sm:rounded-2xl"
    >
      {/* Progreso de lectura (scroll-driven) */}
      <div aria-hidden="true" className="saga-progress-bar fixed inset-x-0 top-0 z-40 h-1 bg-[var(--saga-primary)]" />

      <header className="mb-8 space-y-3">
        <BackToSagas />
        <p className="text-xs font-semibold tracking-widest text-[var(--saga-accent)] uppercase">Saga {saga.order}</p>
        <h1
          className="text-3xl font-black text-[var(--saga-primary)] sm:text-4xl"
          style={{ viewTransitionName: transitionName('saga-title', saga.id) }}
        >
          {saga.title}
        </h1>
        <p className="text-lg font-medium">{saga.subtitle}</p>
        <p className="max-w-2xl leading-relaxed opacity-90">{saga.intro}</p>
        <p className="text-sm opacity-70">
          Desplázate para navegar. Con el teclado: ← y → (o los botones del panel) cambian de etapa.
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-8">
        {/* Panel persistente: mapa, progreso y métricas de la etapa activa */}
        <aside
          aria-label="Bitácora de navegación"
          className="sticky top-0 z-20 -mx-4 mb-6 space-y-3 border-b border-[var(--saga-surface)] bg-[var(--saga-background)] px-4 py-3 transition-colors duration-700 motion-reduce:transition-none lg:top-4 lg:order-2 lg:mx-0 lg:mb-0 lg:self-start lg:rounded-2xl lg:border lg:p-4"
        >
          <GrandLineMap width={map.width} height={map.height} stages={stages} activeIndex={activeIndex} />

          <div aria-live="polite" className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <p className="font-semibold">
                Etapa {activeIndex + 1} de {stages.length} · {activeStage.island.name}
              </p>
              {distance && (
                <p className="opacity-80">
                  {numberFormat.format(distance.value)} de {numberFormat.format(saga.totalDistanceNm)} mn
                </p>
              )}
            </div>
            <div
              role="progressbar"
              aria-label="Progreso del recorrido"
              aria-valuemin={1}
              aria-valuemax={stages.length}
              aria-valuenow={activeIndex + 1}
              className="h-2 overflow-hidden rounded-full bg-[var(--saga-surface)]"
            >
              <div
                className="h-full origin-left rounded-full bg-[var(--saga-primary)] transition-transform duration-500 motion-reduce:transition-none"
                style={{ transform: `scaleX(${(activeIndex + 1) / stages.length})` }}
              />
            </div>

            <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-2">
              {activeStage.metrics.map((metric) => (
                <div key={metric.key} className="rounded-lg bg-[var(--saga-surface)] px-2 py-1 sm:p-2 lg:p-3">
                  <dt className="text-[0.7rem] leading-tight opacity-75 sm:text-xs">{metric.label}</dt>
                  <dd className="text-xs font-bold whitespace-nowrap text-[var(--saga-primary)] sm:text-base">{formatMetric(metric)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goToStage(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="rounded-lg border border-[var(--saga-text)]/40 px-3 py-1.5 text-sm font-medium disabled:opacity-40"
            >
              ← Etapa anterior
            </button>
            <button
              type="button"
              onClick={() => goToStage(activeIndex + 1)}
              disabled={activeIndex === stages.length - 1}
              className="rounded-lg border border-[var(--saga-text)]/40 px-3 py-1.5 text-sm font-medium disabled:opacity-40"
            >
              Etapa siguiente →
            </button>
          </div>

          <nav aria-label="Etapas" className="hidden lg:block">
            <ol className="space-y-1 text-sm">
              {stages.map((stage, index) => (
                <li key={stage.id}>
                  <button
                    type="button"
                    onClick={() => goToStage(index)}
                    aria-current={index === activeIndex ? 'step' : undefined}
                    className={`w-full rounded-md px-2 py-1 text-left ${
                      index === activeIndex ? 'bg-[var(--saga-surface)] font-semibold text-[var(--saga-primary)]' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {stage.order}. {stage.title}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        {/* Etapas: cada una se activa al cruzar la mitad de la pantalla */}
        <ol className="lg:order-1">
          {stages.map((stage, index) => (
            <li key={stage.id}>
              <section
                ref={(element) => {
                  sectionRefs.current[index] = element;
                }}
                data-index={index}
                tabIndex={-1}
                aria-labelledby={`stage-${stage.id}`}
                className="flex min-h-[80vh] scroll-mt-[46vh] items-center py-8 outline-none focus-visible:ring-2 focus-visible:ring-[var(--saga-accent)] lg:scroll-mt-8"
              >
                <div className="saga-stage-content w-full rounded-2xl bg-[var(--saga-surface)] p-6">
                  <p className="text-xs font-semibold tracking-widest text-[var(--saga-accent)] uppercase">
                    Etapa {stage.order} · {stage.island.name}
                  </p>
                  <h2 id={`stage-${stage.id}`} className="mt-1 text-2xl font-bold text-[var(--saga-primary)]">
                    {stage.title}
                  </h2>
                  <div className="mt-4 space-y-3 leading-relaxed">
                    {stage.narrative.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </section>
            </li>
          ))}
        </ol>
      </div>

      <footer className="flex min-h-[30vh] flex-col items-center justify-center gap-2 text-center">
        <p className="font-semibold">Fin de la saga · {saga.lastIsland}</p>
        <BackToSagas />
      </footer>
    </div>
  );
}
