/**
 * 智能预警服务 — 独立领域接口
 * ═══════════════════════════════════════════════════════════════════
 * 架构说明：智能预警是 AI 决策的子集（智能预警 ⊂ AI）。
 * 预警由 AI/规则引擎生成，此服务仅管理预警生命周期（确认/处理）。
 * ═══════════════════════════════════════════════════════════════════
 */
import { api, raw } from '../client';
import { API_DOMAINS } from '@/shared';
import type { QueryParams } from '@/types/db';

const BASE = API_DOMAINS.smart;

export interface SmartAlertCount {
  total: number;
  pending: number;
}

export const smartAlertService = {
  alertList: (params?: QueryParams) => raw.get<unknown>(`${BASE}/alerts`, params),
  alertCount: () => api.get<SmartAlertCount>(`${BASE}/alerts/count`),
  createAlert: (data: unknown) => api.post<unknown>(`${BASE}/alerts`, data),
  updateAlert: (id: number, data: unknown) => api.put<unknown>(`${BASE}/alerts/${id}`, data),
  deleteAlert: (id: number) => api.delete<unknown>(`${BASE}/alerts/${id}`),
  confirmAlert: (id: number) => api.put<null>(`${BASE}/alerts/${id}/confirm`, {}),
  handleAlert: (id: number) => api.put<null>(`${BASE}/alerts/${id}/handle`, {}),
};
