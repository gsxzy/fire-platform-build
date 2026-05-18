import { api as httpApi, paginatedQuery } from '../client';
import type { QueryParams, PatrolPlan, PatrolRecord, Hazard } from '@/types/db';

export const patrolPlanService = {
  list: (params: QueryParams = {}) => paginatedQuery<PatrolPlan>('/patrol/plans', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<PatrolPlan, 'id'>) => httpApi.post<null>('/patrol/plans', data),
  update: (id: string, data: Partial<PatrolPlan>) => httpApi.put<null>(`/patrol/plans/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/patrol/plans/${id}`),
};

export const patrolRecordService = {
  list: (params: QueryParams = {}) => paginatedQuery<PatrolRecord>('/patrol/records', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<PatrolRecord, 'id'>) => httpApi.post<null>('/patrol/records', data),
  update: (id: string, data: Partial<PatrolRecord>) => httpApi.put<null>(`/patrol/records/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/patrol/records/${id}`),
  checkIn: (id: string, data: { result?: number; abnormalDesc?: string; photos?: string[]; signature?: string; checkItems?: unknown[] }) =>
    httpApi.post<null>(`/patrol/records/${id}/checkin`, data),
};

export const hazardService = {
  list: (params: QueryParams = {}) => paginatedQuery<Hazard>('/patrol/hazards', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<Hazard, 'id'>) => httpApi.post<null>('/patrol/hazards', data),
  update: (id: string, data: Partial<Hazard>) => httpApi.put<null>(`/patrol/hazards/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/patrol/hazards/${id}`),
  rectify: (id: string, data?: { rectificationMeasures?: string; afterPhoto?: string; rectifierName?: string }) =>
    httpApi.put<null>(`/patrol/hazards/${id}/rectify`, data ?? {}),
};
