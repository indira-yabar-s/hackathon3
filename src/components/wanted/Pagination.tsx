interface PaginationProps {
  page: number; // desde 0
  totalPages: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}

const buttonClass =
  'rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40';

export function Pagination({ page, totalPages, disabled, onPageChange }: PaginationProps) {
  const isFirst = page <= 0;
  const isLast = page >= totalPages - 1;

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" className={buttonClass} disabled={disabled || isFirst} onClick={() => onPageChange(0)}>
        « Primera
      </button>
      <button type="button" className={buttonClass} disabled={disabled || isFirst} onClick={() => onPageChange(page - 1)}>
        ‹ Anterior
      </button>
      <span className="min-w-36 text-center text-sm text-slate-300">
        Página {totalPages === 0 ? 0 : page + 1} de {totalPages}
      </span>
      <button type="button" className={buttonClass} disabled={disabled || isLast} onClick={() => onPageChange(page + 1)}>
        Siguiente ›
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || isLast}
        onClick={() => onPageChange(totalPages - 1)}
      >
        Última »
      </button>
    </nav>
  );
}
