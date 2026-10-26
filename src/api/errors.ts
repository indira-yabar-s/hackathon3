import axios from 'axios';
import type { ApiError } from '../types/api';

// La API siempre responde errores con este formato: { status, code, message, traceId, details? }
function isApiErrorBody(data: unknown): data is ApiError {
  return (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    typeof data.code === 'string' &&
    'message' in data &&
    typeof data.message === 'string'
  );
}

// Convierte cualquier cosa lanzada en un catch (unknown) en un ApiError. Reemplaza `catch (error: any)`.
export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;
    if (isApiErrorBody(data)) return data;

    if (error.response) {
      return {
        status: error.response.status,
        code: 'HTTP_ERROR',
        message: 'El servidor respondió con un error inesperado.',
        traceId: '',
      };
    }
    return {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor. Revisa tu conexión.',
      traceId: '',
    };
  }

  return { status: 0, code: 'UNKNOWN_ERROR', message: 'Ocurrió un error inesperado.', traceId: '' };
}

// true si la request fue cancelada con AbortController (no es un error real)
export function isCanceled(error: unknown): boolean {
  return axios.isCancel(error);
}
