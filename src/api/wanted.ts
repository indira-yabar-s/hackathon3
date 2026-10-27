import { api } from './client';
import { toWantedApiParams } from '../features/wanted/params';
import type { WantedDetail, WantedPage, WantedQuery } from '../types/api';

export async function getWanted(query: WantedQuery, signal?: AbortSignal): Promise<WantedPage> {
  const { data } = await api.get<WantedPage>('/wanted', { params: toWantedApiParams(query), signal });
  return data;
}

export async function getWantedById(id: string, signal?: AbortSignal): Promise<WantedDetail> {
  const { data } = await api.get<WantedDetail>(`/wanted/${encodeURIComponent(id)}`, { signal });
  return data;
}
