import { api } from './client';
import type { DashboardSummary, LogPose } from '../types/api';

export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/dashboard/summary', { signal });
  return data;
}

export async function getLogPose(signal?: AbortSignal): Promise<LogPose> {
  const { data } = await api.get<LogPose>('/log-pose', { signal });
  return data;
}
