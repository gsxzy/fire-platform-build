import { api as httpApi, paginatedQuery } from '../client';
import type { QueryParams, DutySchedule, DutyShift, DutyHandover } from '@/types/db';
import { createService } from './core';

export const dutyService = {
  // ── 排班 ──
  list: (params: QueryParams = {}) => paginatedQuery<DutySchedule>('/duty/schedules', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<DutySchedule, 'id'>) => httpApi.post<null>('/duty/schedules', data),
  update: (id: string, data: Partial<DutySchedule>) => httpApi.put<null>(`/duty/schedules/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/duty/schedules/${id}`),

  // ── 班次定义 ──
  shiftList: (params: QueryParams = {}) => paginatedQuery<DutyShift>('/duty/shifts', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  shiftCreate: (data: Partial<DutyShift>) => httpApi.post<null>('/duty/shifts', data),
  shiftUpdate: (id: string, data: Partial<DutyShift>) => httpApi.put<null>(`/duty/shifts/${id}`, data),
  shiftDelete: (id: string) => httpApi.delete<null>(`/duty/shifts/${id}`),
  shiftToggle: (id: string, status: number) => httpApi.patch<null>(`/duty/shifts/${id}/status`, { status }),

  // ── 值班日志 ──
  logList: (params: QueryParams = {}) => paginatedQuery<any>('/duty/logs', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  addLog: (data: { scheduleId?: string; content: string; attachments?: string; eventSource?: string }) =>
    httpApi.post<null>('/duty/logs', data),
  logSummary: (scheduleId: string) => httpApi.get<any>(`/duty/logs/summary/${scheduleId}`),

  // ── 交接班 ──
  handoverList: (params: QueryParams = {}) => paginatedQuery<DutyHandover>('/duty/handovers', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  handoverCreate: (data: Partial<DutyHandover>) => httpApi.post<null>('/duty/handovers', data),
  handoverAccept: (id: string, toSignature?: string) => httpApi.post<null>(`/duty/handovers/${id}/accept`, { toSignature }),
  handoverSummary: (scheduleId: string) => httpApi.get<any>(`/duty/handovers/summary?scheduleId=${scheduleId}`),

  // ── 接警处置 ──
  dispatchList: (params: QueryParams = {}) => paginatedQuery<any>('/dispatch', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  dispatchStats: () => httpApi.get<any>('/dispatch/stats'),
  dispatchById: (id: string) => httpApi.get<any>(`/dispatch/${id}`),
  dispatchAction: (id: string, handlerId: string, handlerName: string, note?: string) =>
    httpApi.post<null>(`/dispatch/${id}/dispatch`, { handlerId, handlerName, note }),
  transferAction: (id: string, newHandlerId: string, newHandlerName: string, note?: string) =>
    httpApi.post<null>(`/dispatch/${id}/transfer`, { newHandlerId, newHandlerName, note }),
  startHandling: (id: string, note?: string) =>
    httpApi.post<null>(`/dispatch/${id}/start-handling`, { note }),
  resolveDispatch: (id: string, result: string, note?: string) =>
    httpApi.post<null>(`/dispatch/${id}/resolve`, { result, note }),
  markFalseAlarm: (id: string, note?: string) =>
    httpApi.post<null>(`/dispatch/${id}/false-alarm`, { note }),

  // ── 签到/签退 ──
  checkIn: (scheduleId?: string) => httpApi.post<null>('/duty/check-in', { scheduleId }),
  checkOut: (handoverContent?: string, incidents?: string) =>
    httpApi.post<null>('/duty/check-out', { handoverContent, incidents }),

  // ── 当前值班/缺勤 ──
  currentDuty: () => httpApi.get<unknown>('/duty/current'),
  absenceAlert: () => httpApi.get<unknown>('/duty/absence-alert'),
};

/** @deprecated 排班已统一至 dutyService，请使用 dutyService.list/create/update/delete */
export const dutyShiftService = createService<DutyShift>('/duty-shifts');

/** @deprecated 交接班已统一至 /duty/handovers，请使用 dutyService.handoverList */
export const dutyHandoverService = createService<DutyHandover>('/duty-handovers');
