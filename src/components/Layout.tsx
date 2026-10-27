import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-slate-700 text-amber-300' : 'text-slate-300 hover:bg-slate-800'
  }`;

// Marco de las páginas privadas: navbar + contenido de la ruta (<Outlet />)
export function Layout() {
  const { team, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    // Primero salimos del área privada para que ProtectedRoute no guarde esta página como "from"
    navigate('/login', { replace: true });
    logout();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="font-bold tracking-wide text-amber-400">Log Pose Console</span>
            <NavLink to="/" end className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/wanted" className={linkClass}>
              Se Busca
            </NavLink>
            <NavLink to="/news" className={linkClass}>
              Noticias
            </NavLink>
            <NavLink to="/sagas" className={linkClass}>
              Sagas
            </NavLink>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {team && (
              <span className="text-slate-300">
                {team.name} <span className="text-slate-500">· {team.code}</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-200 hover:bg-slate-800"
            >
              Cerrar sesión
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
