import type { NewsFilters, NewsPriority, NewsStatus, NewsType } from '../../types/api';

// Listas blancas: lo que no esté aquí se ignora (una URL inválida nunca rompe el feed)
export const NEWS_TYPES: readonly NewsType[] = ['BOUNTY_UPDATE', 'BATTLE', 'MARINE_OPERATION', 'WORLD_GOVERNMENT', 'DISCOVERY'];
export const NEWS_PRIORITIES: readonly NewsPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const NEWS_STATUSES: readonly NewsStatus[] = ['RUMOR', 'CONFIRMED', 'DEBUNKED'];

export const NEWS_TYPE_LABEL: Record<NewsType, string> = {
  BOUNTY_UPDATE: 'Recompensas',
  BATTLE: 'Batalla',
  MARINE_OPERATION: 'Operación de la Marina',
  WORLD_GOVERNMENT: 'Gobierno Mundial',
  DISCOVERY: 'Descubrimiento',
};

export const NEWS_PRIORITY_LABEL: Record<NewsPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const NEWS_PRIORITY_BADGE: Record<NewsPriority, string> = {
  LOW: 'bg-slate-500/20 text-slate-300 ring-slate-500/40',
  MEDIUM: 'bg-sky-500/15 text-sky-300 ring-sky-500/40',
  HIGH: 'bg-amber-500/15 text-amber-300 ring-amber-500/40',
  CRITICAL: 'bg-red-500/15 text-red-300 ring-red-500/40',
};

export const NEWS_STATUS_LABEL: Record<NewsStatus, string> = {
  RUMOR: 'Rumor',
  CONFIRMED: 'Confirmada',
  DEBUNKED: 'Desmentida',
};

export const NEWS_STATUS_BADGE: Record<NewsStatus, string> = {
  RUMOR: 'bg-violet-500/15 text-violet-300 ring-violet-500/40',
  CONFIRMED: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  DEBUNKED: 'bg-rose-500/15 text-rose-300 ring-rose-500/40',
};

function pick<T extends string>(allowed: readonly T[], value: string | null): T | undefined {
  return allowed.find((option) => option === value);
}

// URL → filtros tipados (lo inválido se descarta)
export function parseNewsFilters(params: URLSearchParams): NewsFilters {
  return {
    type: pick(NEWS_TYPES, params.get('type')),
    priority: pick(NEWS_PRIORITIES, params.get('priority')),
    status: pick(NEWS_STATUSES, params.get('status')),
  };
}

// Filtros → URL (solo los definidos, en orden fijo)
export function serializeNewsFilters(filters: NewsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.status) params.set('status', filters.status);
  return params;
}

// Clave estable: identifica "qué feed" se está mostrando
export function newsFiltersKey(filters: NewsFilters): string {
  return serializeNewsFilters(filters).toString();
}

const dateTime = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
