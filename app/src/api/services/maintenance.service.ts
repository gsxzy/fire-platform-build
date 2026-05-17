import { api as httpApi, raw, paginatedQuery } from '../client';
import type { QueryParams, WorkOrder, MaintRecord, MaintContract } from '@/types/db';

export const workOrderService = {
  list: (params: QueryParams = {}) => paginatedQuery<WorkOrder>('/maintenance/work-orders', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<WorkOrder, 'id'>) => httpApi.post<null>('/maintenance/work-orders', data),
  update: (id: string, data: Partial<WorkOrder>) => httpApi.put<null>(`/maintenance/work-orders/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/maintenance/work-orders/${id}`),
};

export const maintRecordService = {
  list: (params: QueryParams = {}) => paginatedQuery<MaintRecord>('/maintenance/records', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<MaintRecord, 'id'>) => httpApi.post<null>('/maintenance/records', data),
  update: (id: string, data: Partial<MaintRecord>) => httpApi.put<null>(`/maintenance/records/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/maintenance/records/${id}`),
};

export const maintContractService = {
  list: (params: QueryParams = {}) => paginatedQuery<MaintContract>('/maintenance/contracts', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<MaintContract, 'id'>) => httpApi.post<null>('/maintenance/contracts', data),
  update: (id: string, data: Partial<MaintContract>) => httpApi.put<null>(`/maintenance/contracts/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/maintenance/contracts/${id}`),
};

export const maintenanceStatsService = {
  stats: () => raw.get<Record<string, unknown>>('/maintenance/stats'),
};
