import { api as httpApi, paginatedQuery } from '../client';
import type { QueryParams } from '@/types/db';

export const inspectionService = {
  list: (params: QueryParams = {}) => paginatedQuery<any>('/inspections', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: any) => httpApi.post<null>('/inspections', data),
  update: (id: string, data: any) => httpApi.put<null>(`/inspections/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/inspections/${id}`),

  /* ── 检查项模板 ── */
  templateList: (params: QueryParams = {}) => paginatedQuery<any>('/inspections/templates', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  createTemplate: (data: any) => httpApi.post<null>('/inspections/templates', data),
  updateTemplate: (id: string, data: any) => httpApi.put<null>(`/inspections/templates/${id}`, data),
  deleteTemplate: (id: string) => httpApi.delete<null>(`/inspections/templates/${id}`),
};
