import { api } from './client';
import type { LoginRequest, LoginResponse, MeResponse, RegisterRequest } from '../types/api';

// Sin try/catch aquí: el error sube a quien llama, que decide qué mostrar (toApiError).

export async function register(body: RegisterRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/register', body);
  return data;
}

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', body);
  return data;
}

export async function getMe(signal?: AbortSignal): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/auth/me', { signal });
  return data;
}
