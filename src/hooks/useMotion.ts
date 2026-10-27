import { useCallback, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

// true si el sistema pide reducir movimiento (se actualiza en vivo si el usuario lo cambia)
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

// Navega con View Transition API si el navegador la soporta (y no se pidió reducir movimiento);
// si no, es una navegación normal.
export function useViewTransitionNavigate() {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  return useCallback(
    (to: To, options?: NavigateOptions) => {
      if (!reducedMotion && typeof document.startViewTransition === 'function') {
        document.startViewTransition(() => {
          // flushSync: el DOM nuevo debe existir cuando el navegador toma la "foto" de llegada
          flushSync(() => navigate(to, options));
        });
      } else {
        navigate(to, options);
      }
    },
    [navigate, reducedMotion],
  );
}

// Nombre de view-transition válido en CSS a partir de un id
export const transitionName = (prefix: string, id: string) => `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
