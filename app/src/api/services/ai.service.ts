import { api, raw } from '../client';
import { API_DOMAINS } from '@/shared';
import type { QueryParams } from '@/types/db';

const BASE = API_DOMAINS.ai;

export const aiService = {
  decisionList: (params?: QueryParams) => raw.get<unknown>(`${BASE}/decisions`, params),
  createDecision: (data: unknown) => raw.post<unknown>(`${BASE}/decisions`, data),

  alertList: (params?: QueryParams) => raw.get<unknown>(`${BASE}/alerts`, params),
  alertConfirm: (id: number) => api.put<null>(`${BASE}/alerts/${id}/confirm`, {}),
  alertHandle: (id: number) => api.put<null>(`${BASE}/alerts/${id}/handle`, {}),

  riskAnalysis: (scene: string, inputData: unknown) =>
    api.post<unknown>(`${BASE}/risk-analysis`, { scene, inputData }),

  trend: (days?: number) => raw.get<unknown>(`${BASE}/trend`, { days }),
};
