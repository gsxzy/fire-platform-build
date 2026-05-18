import { api, raw } from '../client';
import { API_DOMAINS } from '@/shared';
import type { QueryParams } from '@/types/db';

const BASE = API_DOMAINS.ai;

export interface AIDecisionOverview {
  radarData: Array<{ subject: string; A: number; B: number }>;
  decisions: Array<{
    id: number;
    title: string;
    type: string;
    status: string;
    confidence: number;
    time: string;
    content: string;
    scene?: string;
    analysis?: Record<string, unknown>;
  }>;
  stats: {
    todayDecision: number;
    active: number;
    handled: number;
    avgConfidence: number;
    responseTime: string;
  };
}

export const aiService = {
  /** AI 决策中心概览（雷达图 + 决策卡片 + 统计） */
  overview: () => api.get<AIDecisionOverview>(`${BASE}/decisions/overview`),

  /** 执行 AI 决策建议（生成下游工单） */
  executeDecision: (id: number) =>
    api.post<{ executed: boolean; workOrderId: number; workOrderNo: string; message: string }>(
      `${BASE}/decisions/${id}/execute`,
      {}
    ),

  decisionList: (params?: QueryParams) => raw.get<unknown>(`${BASE}/decisions`, params),
  createDecision: (data: unknown) => raw.post<unknown>(`${BASE}/decisions`, data),

  alertList: (params?: QueryParams) => raw.get<unknown>(`${BASE}/alerts`, params),
  alertConfirm: (id: number) => api.put<null>(`${BASE}/alerts/${id}/confirm`, {}),
  alertHandle: (id: number) => api.put<null>(`${BASE}/alerts/${id}/handle`, {}),

  riskAnalysis: (scene: string, inputData: unknown) =>
    api.post<unknown>(`${BASE}/risk-analysis`, { scene, inputData }),

  trend: (days?: number) => raw.get<unknown>(`${BASE}/trend`, { days }),
};
