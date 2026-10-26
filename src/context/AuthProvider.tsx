import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import { setSessionExpiredHandler, tokenStorage } from '../api/client';
import { isCanceled, toApiError } from '../api/errors';
import type { ApiError, LoginRequest, LoginResponse, RegisterRequest, Team, User } from '../types/api';
import { AuthContext, type AuthContextValue } from './auth-context';

// Unión discriminada: user/team solo existen cuando la sesión es válida
type Session =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User; team: Team };

const ANONYMOUS: Session = { status: 'anonymous' };

export function AuthProvider({ children }: { children: ReactNode }) {
  // Si hay token guardado arrancamos en "checking": así nunca se ve el login mientras se verifica
  const [session, setSession] = useState<Session>(() =>
    tokenStorage.get() ? { status: 'checking' } : ANONYMOUS,
  );
  const [restoreError, setRestoreError] = useState<ApiError | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  // ── Restaurar sesión al recargar (mounting) ──
  useEffect(() => {
    if (!tokenStorage.get()) return;

    const controller = new AbortController();
    authApi
      .getMe(controller.signal)
      .then(({ user, team }) => setSession({ status: 'authenticated', user, team }))
      .catch((error: unknown) => {
        if (isCanceled(error)) return;
        const apiError = toApiError(error);
        if (apiError.status === 401) {
          tokenStorage.clear();
          setSession(ANONYMOUS);
        } else {
          // Red caída o 5xx: el token puede seguir siendo válido → error con reintento
          setRestoreError(apiError);
        }
      });

    // Cleanup: si el componente se desmonta (o StrictMode repite el efecto), se cancela la request
    return () => controller.abort();
  }, [restoreAttempt]);

  // ── Sesión inválida en cualquier request → anónimo (ProtectedRoute redirige al login) ──
  useEffect(() => {
    setSessionExpiredHandler(() => setSession(ANONYMOUS));
    return () => setSessionExpiredHandler(null);
  }, []);

  const startSession = useCallback((response: LoginResponse) => {
    tokenStorage.set(response.token);
    setRestoreError(null);
    setSession({ status: 'authenticated', user: response.user, team: response.team });
  }, []);

  const login = useCallback(
    async (body: LoginRequest) => startSession(await authApi.login(body)),
    [startSession],
  );

  // El registro ya devuelve la sesión iniciada: entra directo, sin segundo login
  const register = useCallback(
    async (body: RegisterRequest) => startSession(await authApi.register(body)),
    [startSession],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setSession(ANONYMOUS);
  }, []);

  const retryRestore = useCallback(() => {
    setRestoreError(null);
    setRestoreAttempt((n) => n + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: session.status,
      user: session.status === 'authenticated' ? session.user : null,
      team: session.status === 'authenticated' ? session.team : null,
      restoreError,
      retryRestore,
      login,
      register,
      logout,
    }),
    [session, restoreError, retryRestore, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
