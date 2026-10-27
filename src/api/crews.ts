import { api } from './client';
import type { Crew } from '../types/api';

export async function getCrews(signal?: AbortSignal): Promise<Crew[]> {
  const { data } = await api.get<Crew[]>('/crews', { signal });
  return data;
}
