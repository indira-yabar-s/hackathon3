// Estados reutilizables: loading, error con reintento y vacío

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent motion-reduce:animate-none"
    />
  );
}

export function FullScreenLoader({ label }: { label: string }) {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center gap-3 text-slate-300">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function LoadingBlock({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-slate-300">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function ErrorWithRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-xl border border-red-500/40 bg-red-950/40 p-6 text-center">
      <p className="mb-4 text-red-200">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-400"
      >
        Reintentar
      </button>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-600 p-10 text-center">
      <p className="text-lg font-semibold text-slate-200">{title}</p>
      <p className="mt-1 text-slate-400">{description}</p>
    </div>
  );
}

// 423 LOG_POSE_REQUIRED: el equipo aún no aprobó la inspección del CP3
export function GrandLineLocked() {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-xl border border-amber-500/40 bg-amber-950/30 p-6 text-center">
      <p className="text-lg font-semibold text-amber-300">Grand Line bloqueado</p>
      <p className="mt-1 text-slate-300">
        Esta sección se desbloquea cuando la tripulación aprueba la inspección del Log Pose en Reverse Mountain.
      </p>
    </div>
  );
}
