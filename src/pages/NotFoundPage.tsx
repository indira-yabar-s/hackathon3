import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-6xl font-black text-amber-400">404</p>
      <h1 className="text-2xl font-bold text-slate-100">Esta ruta no aparece en ningún mapa</h1>
      <p className="text-slate-400">La página que buscas no existe.</p>
      <Link to="/" className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-300">
        Volver al inicio
      </Link>
    </main>
  );
}
