import { api as httpApi, paginatedQuery } from '../client';
import type { QueryParams, DutySchedule, DutyShift, DutyHandover } from '@/types/db';
import { createService } from './core';

export const dutyService = {
  list: (params: QueryParams = {}) => paginatedQuery<DutySchedule>('/duty/schedules', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<DutySchedule, 'id'>) => httpApi.post<null>('/duty/schedules', data),
  update: (id: string, data: Partial<DutySchedule>) => httpApi.put<null>(`/duty/schedules/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/duty/schedules/${id}`),
};

export const dutyShiftService = createService<DutyShift>('/duty-shifts');
export const dutyHandoverService = createService<DutyHandover>('/duty-handovers');
