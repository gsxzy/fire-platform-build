import { api as httpApi, paginatedQuery } from '../client';
import type { QueryParams, Inspection } from '@/types/db';

export const inspectionService = {
  list: (params: QueryParams = {}) => paginatedQuery<Inspection>('/inspections', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<Inspection, 'id'>) => httpApi.post<null>('/inspections', data),
  update: (id: string, data: Partial<Inspection>) => httpApi.put<null>(`/inspections/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/inspections/${id}`),
};
