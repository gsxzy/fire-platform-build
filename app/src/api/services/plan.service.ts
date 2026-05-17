import { api as httpApi, paginatedQuery } from '../client';
import type { QueryParams, Plan, Drill } from '@/types/db';

export const planService = {
  list: (params: QueryParams = {}) => paginatedQuery<Plan>('/plans', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<Plan, 'id'>) => httpApi.post<null>('/plans', data),
  update: (id: string, data: Partial<Plan>) => httpApi.put<null>(`/plans/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/plans/${id}`),
};

export const drillService = {
  list: (params: QueryParams = {}) => paginatedQuery<Drill>('/drills', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<Drill, 'id'>) => httpApi.post<null>('/drills', data),
  update: (id: string, data: Partial<Drill>) => httpApi.put<null>(`/drills/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/drills/${id}`),
};
