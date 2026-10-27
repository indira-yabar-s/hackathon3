import { api } from './client';
import type { NewsDetail, NewsFeed, NewsFilters, VerifiedNewsStatus } from '../types/api';

export const NEWS_PAGE_LIMIT = 20;

// Primera carga sin cursor; las siguientes con el nextCursor anterior y LOS MISMOS filtros
export async function getNewsFeed(
  filters: NewsFilters,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<NewsFeed> {
  const params: Record<string, string | number> = { limit: NEWS_PAGE_LIMIT };
  if (cursor) params.cursor = cursor;
  if (filters.type) params.type = filters.type;
  if (filters.priority) params.priority = filters.priority;
  if (filters.status) params.status = filters.status;

  const { data } = await api.get<NewsFeed>('/news/feed', { params, signal });
  return data;
}

export async function getNewsById(id: string, signal?: AbortSignal): Promise<NewsDetail> {
  const { data } = await api.get<NewsDetail>(`/news/${encodeURIComponent(id)}`, { signal });
  return data;
}

export async function updateNewsStatus(id: string, status: VerifiedNewsStatus): Promise<NewsDetail> {
  const { data } = await api.patch<NewsDetail>(`/news/${encodeURIComponent(id)}/status`, { status });
  return data;
}
