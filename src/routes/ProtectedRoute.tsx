import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorWithRetry, FullScreenLoader } from '../components/AsyncStates';
import { useAuth } from '../hooks/useAuth';

// Portero de las rutas privadas
export function ProtectedRoute() {
  const { status, restoreError, retryRestore } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return restoreError ? (
      <div className="flex min-h-screen items-center justify-center p-4">
        <ErrorWithRetry message={restoreError.message} onRetry={retryRestore} />
      </div>
    ) : (
      <FullScreenLoader label="Verificando sesión…" />
    );
  }

  if (status === 'anonymous') {
    // Guardamos ruta + query (?page=2&...) para volver exactamente ahí después del login
    const from = location.pathname + location.search + location.hash;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <Outlet />;
}
