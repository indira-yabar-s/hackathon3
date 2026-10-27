import { api } from './client';
import type { SagaStory, SagaSummary } from '../types/api';

export async function getSagas(signal?: AbortSignal): Promise<SagaSummary[]> {
  const { data } = await api.get<SagaSummary[]>('/sagas', { signal });
  return data;
}

export async function getSagaStory(id: string, signal?: AbortSignal): Promise<SagaStory> {
  const { data } = await api.get<SagaStory>(`/sagas/${encodeURIComponent(id)}/story`, { signal });
  return data;
}
