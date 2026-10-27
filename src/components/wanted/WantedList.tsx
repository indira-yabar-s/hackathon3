import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from '../AsyncStates';
import { FRUIT_LABEL, STATUS_BADGE, STATUS_LABEL, formatBerries } from '../../features/wanted/labels';
import type { WantedSummary } from '../../types/api';

// Todas las variantes (skeleton, filas, vacío, error) viven en el mismo contenedor de alto mínimo:
// cambiar de estado no mueve el resto de la página.
const CONTAINER = 'relative min-h-[32rem] rounded-xl border border-slate-700 bg-slate-800/40';

export function WantedListSkeleton({ rows }: { rows: number }) {
  return (
    <div role="status" aria-label="Cargando carteles" className={CONTAINER}>
      <ul className="divide-y divide-slate-700/60">
        {Array.from({ length: Math.min(rows, 10) }, (_, index) => (
          <li key={index} className="flex h-16 items-center gap-4 px-4">
            <span className="h-4 w-1/3 animate-pulse rounded bg-slate-700 motion-reduce:animate-none" />
            <span className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-700 motion-reduce:animate-none" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WantedListMessage({ children }: { children: ReactNode }) {
  return <div className={`${CONTAINER} flex items-center justify-center p-6`}>{children}</div>;
}

interface WantedListProps {
  items: WantedSummary[];
  loading: boolean; // hay una carga en curso: se muestran los datos anteriores atenuados
  onOpenDetail: () => void;
}

export function WantedList({ items, loading, onOpenDetail }: WantedListProps) {
  return (
    <div className={CONTAINER} aria-busy={loading}>
      <ul className={`divide-y divide-slate-700/60 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {items.map((wanted) => (
          <li key={wanted.id}>
            <Link
              to={`/wanted/${encodeURIComponent(wanted.id)}`}
              state={{ fromList: true }}
              onClick={onOpenDetail}
              className="grid min-h-16 grid-cols-1 gap-1 px-4 py-3 hover:bg-slate-800 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-100">
                  {wanted.name} <span className="font-normal text-slate-400">«{wanted.epithet}»</span>
                </p>
                <p className="truncate text-sm text-slate-400">
                  {wanted.crew.name} · {wanted.devilFruit ? FRUIT_LABEL[wanted.devilFruit.type] : FRUIT_LABEL.NONE}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_BADGE[wanted.status]}`}>
                  {STATUS_LABEL[wanted.status]}
                </span>
                <span className="font-semibold whitespace-nowrap text-amber-300">{formatBerries(wanted.bounty)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {loading && (
        <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-sm text-slate-200 shadow">
            <Spinner /> Actualizando…
          </span>
        </div>
      )}
    </div>
  );
}
