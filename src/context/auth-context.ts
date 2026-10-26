import { createContext } from 'react';
import type { ApiError, LoginRequest, RegisterRequest, Team, User } from '../types/api';

// checking      → hay token guardado y se está verificando con /auth/me (NO mostrar el login)
// authenticated → sesión válida
// anonymous     → sin sesión
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  team: Team | null;
  restoreError: ApiError | null; // /auth/me falló por red o 5xx (no por token inválido)
  retryRestore: () => void;
  login: (body: LoginRequest) => Promise<void>;
  register: (body: RegisterRequest) => Promise<void>;
  logout: () => void;
}

// El contexto se crea fuera del componente (Lab 11)
export const AuthContext = createContext<AuthContextValue | null>(null);
