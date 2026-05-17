import { raw } from '../client';
import { API_DOMAINS } from '@/shared';
import type { QueryParams } from '@/types/db';

const BASE = API_DOMAINS.linkage;

export const linkageService = {
  listRules: (params?: QueryParams) => raw.get<{ list?: unknown[]; total?: number }>(`${BASE}/rules`, params),
  createRule: (data: unknown) => raw.post<Record<string, unknown>>(`${BASE}/rules`, data),
  updateRule: (id: number, data: unknown) => raw.put<null>(`${BASE}/rules/${id}`, data),
  deleteRule: (id: number) => raw.delete<null>(`${BASE}/rules/${id}`),
  triggerRule: (id: number) => raw.post<unknown>(`${BASE}/rules/${id}/trigger`, {}),
  getStatus: (alarmId: number | string) => raw.get<unknown>(`${BASE}/status/${alarmId}`),
  applyPreset: (data: unknown) => raw.post<unknown>(`${BASE}/preset`, data),
  listRecords: (params?: QueryParams) => raw.get<unknown>(`${BASE}/records`, params),
};
