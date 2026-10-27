import type { FruitFilter, WantedPageSize, WantedQuery, WantedSort, WantedStatus } from '../../types/api';

// Listas blancas: solo estos valores llegan a la API (cualquier otro daría 400)
export const WANTED_SORTS: readonly WantedSort[] = ['bounty,desc', 'name,asc', 'updatedAt,desc'];
export const PAGE_SIZES: readonly WantedPageSize[] = [10, 20, 50];
export const WANTED_STATUSES: readonly WantedStatus[] = ['AT_LARGE', 'CAPTURED', 'MISSING'];
export const FRUIT_FILTERS: readonly FruitFilter[] = ['PARAMECIA', 'ZOAN', 'LOGIA', 'NONE'];

export const DEFAULT_WANTED_QUERY: WantedQuery = { page: 0, size: 20, sort: 'bounty,desc' };

const MAX_Q_LENGTH = 100;
const MAX_CREW_ID_LENGTH = 200;

function pick<T extends string | number>(allowed: readonly T[], value: unknown): T | undefined {
  return allowed.find((option) => option === value);
}

// Normaliza el texto de búsqueda igual que la API (sin espacios en los extremos, máx. 100)
export function normalizeSearch(value: string): string | undefined {
  const trimmed = value.trim().slice(0, MAX_Q_LENGTH);
  return trimmed === '' ? undefined : trimmed;
}

// URL → query tipada. Nunca falla: lo inválido se reemplaza por el valor por defecto.
export function parseWantedParams(params: URLSearchParams): WantedQuery {
  const rawPage = params.get('page');
  const pageNumber = rawPage !== null && /^\d+$/.test(rawPage) ? Number(rawPage) : 0;
  const crewId = params.get('crewId')?.trim();

  return {
    page: Number.isSafeInteger(pageNumber) ? pageNumber : 0,
    size: pick(PAGE_SIZES, Number(params.get('size'))) ?? DEFAULT_WANTED_QUERY.size,
    sort: pick(WANTED_SORTS, params.get('sort')) ?? DEFAULT_WANTED_QUERY.sort,
    status: pick(WANTED_STATUSES, params.get('status')),
    fruit: pick(FRUIT_FILTERS, params.get('fruit')),
    crewId: crewId && crewId.length <= MAX_CREW_ID_LENGTH ? crewId : undefined,
    q: normalizeSearch(params.get('q') ?? ''),
  };
}

// Query → URL. Los valores por defecto no se escriben: /wanted y /wanted?page=0 son la misma vista.
export function serializeWantedQuery(query: WantedQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.status) params.set('status', query.status);
  if (query.crewId) params.set('crewId', query.crewId);
  if (query.fruit) params.set('fruit', query.fruit);
  if (query.sort !== DEFAULT_WANTED_QUERY.sort) params.set('sort', query.sort);
  if (query.size !== DEFAULT_WANTED_QUERY.size) params.set('size', String(query.size));
  if (query.page !== DEFAULT_WANTED_QUERY.page) params.set('page', String(query.page));
  return params;
}

// Clave estable de una consulta (para el caché y para saber si los datos corresponden a la URL)
export function wantedQueryKey(query: WantedQuery): string {
  return serializeWantedQuery(query).toString();
}

// Query → parámetros de axios (solo los definidos)
export function toWantedApiParams(query: WantedQuery): Record<string, string | number> {
  const params: Record<string, string | number> = { page: query.page, size: query.size, sort: query.sort };
  if (query.status) params.status = query.status;
  if (query.crewId) params.crewId = query.crewId;
  if (query.fruit) params.fruit = query.fruit;
  if (query.q) params.q = query.q;
  return params;
}
