import { useEffect, useState } from 'react';
import { getDashboardSummary, getLogPose } from '../api/dashboard';
import { isCanceled, toApiError } from '../api/errors';
import { EmptyState, ErrorWithRetry, LoadingBlock } from '../components/AsyncStates';
import type { ApiError, DashboardSummary, FruitType, LogPose, WantedStatus } from '../types/api';

type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'success'; summary: DashboardSummary; logPose: LogPose };

const berries = new Intl.NumberFormat('es-PE');
const formatBerries = (value: number) => `฿ ${berries.format(value)}`;

const STATUS_LABEL: Record<WantedStatus, string> = {
  AT_LARGE: 'Prófugos',
  CAPTURED: 'Capturados',
  MISSING: 'Desaparecidos',
};

const FRUIT_LABEL: Record<FruitType | 'NONE', string> = {
  PARAMECIA: 'Paramecia',
  ZOAN: 'Zoan',
  LOGIA: 'Logia',
  NONE: 'Sin fruta',
};

export function DashboardPage() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    // Las dos requests en paralelo
    Promise.all([getDashboardSummary(controller.signal), getLogPose(controller.signal)])
      .then(([summary, logPose]) => setState({ status: 'success', summary, logPose }))
      .catch((error: unknown) => {
        if (isCanceled(error)) return;
        setState({ status: 'error', error: toApiError(error) });
      });

    return () => controller.abort();
  }, [reloadKey]);

  function retry() {
    setState({ status: 'loading' });
    setReloadKey((n) => n + 1);
  }

  if (state.status === 'loading') return <LoadingBlock label="Cargando el resumen de la tripulación…" />;
  if (state.status === 'error') return <ErrorWithRetry message={state.error.message} onRetry={retry} />;

  const { summary, logPose } = state;
  const isEmpty = summary.wanted.total === 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-400">
          {summary.team.name} · {summary.team.code}
        </p>
      </header>

      <LogPoseCard logPose={logPose} />

      {isEmpty ? (
        <EmptyState
          title="Sin carteles todavía"
          description="El workspace de tu tripulación no tiene carteles de «Se Busca»."
        />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Carteles" value={berries.format(summary.wanted.total)} />
            <StatCard label="Recompensa total" value={formatBerries(summary.wanted.totalBounty)} />
            <StatCard label="Recompensa promedio" value={formatBerries(summary.wanted.averageBounty)} />
            <StatCard label="Tripulaciones" value={berries.format(summary.crews.total)} />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <BreakdownCard
              title="Por estado"
              rows={(Object.keys(STATUS_LABEL) as WantedStatus[]).map((key) => ({
                label: STATUS_LABEL[key],
                value: summary.wanted.byStatus[key],
              }))}
            />
            <BreakdownCard
              title="Por fruta del diablo"
              rows={(Object.keys(FRUIT_LABEL) as (FruitType | 'NONE')[]).map((key) => ({
                label: FRUIT_LABEL[key],
                value: summary.wanted.byFruit[key],
              }))}
            />
          </section>

          {summary.crews.mostWanted && (
            <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
              <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">Tripulación más buscada</h2>
              <div className="mt-2 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: summary.crews.mostWanted.jollyRogerColor }}
                />
                <p className="text-lg font-semibold text-slate-100">{summary.crews.mostWanted.name}</p>
              </div>
              <p className="text-slate-400">
                Barco {summary.crews.mostWanted.shipName} · {summary.crews.mostWanted.memberCount} carteles ·{' '}
                {formatBerries(summary.crews.mostWanted.totalBounty)}
              </p>
            </section>
          )}

          <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">Top recompensas</h2>
            <ol className="divide-y divide-slate-700">
              {summary.topBounties.map((wanted, index) => (
                <li key={wanted.id} className="flex items-center justify-between gap-4 py-2">
                  <span className="text-slate-200">
                    <span className="mr-2 text-slate-500">{index + 1}.</span>
                    {wanted.name} <span className="text-slate-400">«{wanted.epithet}»</span>
                  </span>
                  <span className="font-semibold whitespace-nowrap text-amber-300">{formatBerries(wanted.bounty)}</span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}

function LogPoseCard({ logPose }: { logPose: LogPose }) {
  const unlocked = logPose.status === 'UNLOCKED';
  return (
    <section
      className={`rounded-xl border p-5 ${
        unlocked ? 'border-emerald-500/50 bg-emerald-950/40' : 'border-amber-500/50 bg-amber-950/30'
      }`}
    >
      <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">Log Pose</h2>
      <p className={`mt-1 text-lg font-bold ${unlocked ? 'text-emerald-300' : 'text-amber-300'}`}>
        {unlocked ? 'Grand Line desbloqueado' : 'Bloqueado: falta la inspección'}
      </p>
      <p className="text-slate-300">{logPose.message}</p>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">{title}</h2>
      <dl className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-slate-200">
            <dt>{row.label}</dt>
            <dd className="font-semibold">{berries.format(row.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
