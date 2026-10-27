import type { Crew, FruitFilter, WantedPageSize, WantedQuery, WantedSort, WantedStatus } from '../../types/api';
import { FRUIT_FILTERS, PAGE_SIZES, WANTED_SORTS, WANTED_STATUSES } from '../../features/wanted/params';
import { FRUIT_LABEL, SORT_LABEL, STATUS_LABEL } from '../../features/wanted/labels';

interface CrewOptions {
  status: 'loading' | 'error' | 'success';
  crews: Crew[] | null;
  retry: () => void;
}

interface WantedFiltersProps {
  query: WantedQuery;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onChange: (patch: Partial<WantedQuery>) => void;
  onClear: () => void;
  crewOptions: CrewOptions;
}

const selectClass =
  'w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60';

// Busca el valor del <select> dentro de la lista blanca (evita castear strings sueltos)
function pick<T extends string | number>(allowed: readonly T[], value: string): T | undefined {
  return allowed.find((option) => String(option) === value);
}

export function WantedFilters({
  query,
  searchInput,
  onSearchInputChange,
  onChange,
  onClear,
  crewOptions,
}: WantedFiltersProps) {
  const crews = crewOptions.crews ?? [];
  // Un crewId de la URL que no está en la lista igual se muestra (la API devolverá una página vacía)
  const unknownCrew = query.crewId !== undefined && crewOptions.status === 'success' && !crews.some((c) => c.id === query.crewId);
  const hasFilters = Boolean(query.q || query.status || query.crewId || query.fruit);

  return (
    <section aria-label="Filtros" className="grid gap-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4 sm:grid-cols-2 lg:grid-cols-6">
      <div className="sm:col-span-2">
        <label htmlFor="wanted-q" className="mb-1 block text-sm text-slate-400">
          Buscar por nombre o epíteto
        </label>
        <input
          id="wanted-q"
          type="search"
          value={searchInput}
          maxLength={100}
          placeholder="Ej. Ancla Roja"
          onChange={(event) => onSearchInputChange(event.target.value)}
          className={selectClass}
        />
      </div>

      <div>
        <label htmlFor="wanted-status" className="mb-1 block text-sm text-slate-400">
          Estado
        </label>
        <select
          id="wanted-status"
          value={query.status ?? ''}
          onChange={(event) => onChange({ status: pick<WantedStatus>(WANTED_STATUSES, event.target.value) })}
          className={selectClass}
        >
          <option value="">Todos</option>
          {WANTED_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="wanted-crew" className="mb-1 block text-sm text-slate-400">
          Tripulación
        </label>
        <select
          id="wanted-crew"
          value={query.crewId ?? ''}
          disabled={crewOptions.status !== 'success'}
          onChange={(event) => onChange({ crewId: event.target.value || undefined })}
          className={selectClass}
        >
          <option value="">{crewOptions.status === 'loading' ? 'Cargando…' : 'Todas'}</option>
          {unknownCrew && <option value={query.crewId}>Tripulación desconocida</option>}
          {crews.map((crew) => (
            <option key={crew.id} value={crew.id}>
              {crew.name}
            </option>
          ))}
        </select>
        {crewOptions.status === 'error' && (
          <button type="button" onClick={crewOptions.retry} className="mt-1 text-xs text-red-300 underline">
            No se cargaron las tripulaciones. Reintentar
          </button>
        )}
      </div>

      <div>
        <label htmlFor="wanted-fruit" className="mb-1 block text-sm text-slate-400">
          Fruta del diablo
        </label>
        <select
          id="wanted-fruit"
          value={query.fruit ?? ''}
          onChange={(event) => onChange({ fruit: pick<FruitFilter>(FRUIT_FILTERS, event.target.value) })}
          className={selectClass}
        >
          <option value="">Todas</option>
          {FRUIT_FILTERS.map((fruit) => (
            <option key={fruit} value={fruit}>
              {FRUIT_LABEL[fruit]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:col-span-1 lg:grid-cols-1">
        <div>
          <label htmlFor="wanted-sort" className="mb-1 block text-sm text-slate-400">
            Orden
          </label>
          <select
            id="wanted-sort"
            value={query.sort}
            onChange={(event) => {
              const sort = pick<WantedSort>(WANTED_SORTS, event.target.value);
              if (sort) onChange({ sort });
            }}
            className={selectClass}
          >
            {WANTED_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABEL[sort]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="wanted-size" className="mb-1 block text-sm text-slate-400">
            Por página
          </label>
          <select
            id="wanted-size"
            value={query.size}
            onChange={(event) => {
              const size = pick<WantedPageSize>(PAGE_SIZES, event.target.value);
              if (size) onChange({ size });
            }}
            className={selectClass}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasFilters && (
        <div className="sm:col-span-2 lg:col-span-6">
          <button type="button" onClick={onClear} className="text-sm font-medium text-amber-400 hover:underline">
            Limpiar filtros y búsqueda
          </button>
        </div>
      )}
    </section>
  );
}
