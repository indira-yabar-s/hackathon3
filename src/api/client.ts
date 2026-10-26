import axios from 'axios';
import { toApiError } from './errors';

const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL) {
  throw new Error('Falta VITE_API_BASE_URL en el archivo .env');
}

// ── Token en localStorage (sobrevive a recargar la página) ──
const TOKEN_KEY = 'logpose.token';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

// ── Aviso de "sesión inválida" ──
// El AuthProvider registra aquí qué hacer cuando el servidor rechaza el token.
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

// ── Instancia única de axios: todas las llamadas pasan por aquí ──
export const api = axios.create({ baseURL });

// Agrega el token a cada request
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token ya no sirve, cierra la sesión.
// OJO: el login fallido también es 401, pero con code INVALID_CREDENTIALS: ese NO cierra sesión.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const { status, code } = toApiError(error);
    if (status === 401 && (code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED')) {
      tokenStorage.clear();
      onSessionExpired?.();
    }
    return Promise.reject(error);
  },
);
