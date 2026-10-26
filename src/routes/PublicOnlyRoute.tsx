import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullScreenLoader } from '../components/AsyncStates';
import { useAuth } from '../hooks/useAuth';
import { getRedirectTarget } from './redirect';

// Login y registro: si ya hay sesión, no tiene sentido mostrarlos.
// También es quien redirige después de login/registro exitoso (status pasa a "authenticated").
export function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return <FullScreenLoader label="Verificando sesión…" />;
  }

  if (status === 'authenticated') {
    return <Navigate to={getRedirectTarget(location.state)} replace />;
  }

  return <Outlet />;
}
