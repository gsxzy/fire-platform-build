import { api as httpApi, paginatedQuery } from '../client';
import type { QueryParams, DutySchedule, DutyShift, DutyHandover } from '@/types/db';
import { createService } from './core';

export const dutyService = {
  list: (params: QueryParams = {}) => paginatedQuery<DutySchedule>('/duty/schedules', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<DutySchedule, 'id'>) => httpApi.post<null>('/duty/schedules', data),
  update: (id: string, data: Partial<DutySchedule>) => httpApi.put<null>(`/duty/schedules/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/duty/schedules/${id}`),

  /* ── 值班日志（签退/交接记录） ── */
  logList: (params: QueryParams = {}) => paginatedQuery<DutyHandover>('/duty/logs', { ...params, pageNum: params.page, pageSize: params.pageSize }),

  /* ── 签到/签退 ── */
  checkIn: () => httpApi.post<null>('/duty/check-in', {}),
  checkOut: (handoverContent?: string, incidents?: string) => httpApi.post<null>('/duty/check-out', { handoverContent, incidents }),

  /* ── 当前值班/缺勤告警 ── */
  currentDuty: () => httpApi.get<unknown>('/duty/current'),
  absenceAlert: () => httpApi.get<unknown>('/duty/absence-alert'),
};

/** @deprecated 排班已统一至 dutyService，请使用 dutyService.list/create/update/delete */
export const dutyShiftService = createService<DutyShift>('/duty-shifts');

/** @deprecated 交接班已统一至 /duty/logs，请使用 dutyService.logList */
export const dutyHandoverService = createService<DutyHandover>('/duty-handovers');
