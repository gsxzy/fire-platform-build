import { api as httpApi } from '../client';
import type { Unit } from '@/types/db';
import { createService } from './core';

export const unitService = {
  ...createService<Unit>('/units'),
  getDetail: (id: string) => httpApi.get<Unit & { buildings: any[]; personnel: any[]; deviceStats: any }>(`/units/${id}`),
  getStats: (id: string) => httpApi.get<any>(`/units/${id}/stats`),
  getPersonnel: (id: string) => httpApi.get<any[]>(`/units/${id}/personnel`),
  addPersonnel: (id: string, data: any) => httpApi.post<any>(`/units/${id}/personnel`, data),
  deletePersonnel: (id: string, pid: string) => httpApi.delete<any>(`/units/${id}/personnel/${pid}`),
  getOverviewStats: () => httpApi.get<any>('/units/stats/overview'),
};
