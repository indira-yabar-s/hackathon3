import type { ReactNode } from 'react';

// Marco común de login y registro
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800/70 p-8 shadow-xl">
        <p className="text-sm font-semibold tracking-widest text-amber-400 uppercase">Log Pose Console</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-100">{title}</h1>
        <p className="mt-1 mb-6 text-slate-400">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}
