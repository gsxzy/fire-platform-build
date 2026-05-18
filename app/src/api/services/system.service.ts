import { api as httpApi, raw, paginatedQuery } from '../client';
import type { QueryParams, User, Role, SystemLog, Personnel } from '@/types/db';
import { createService } from './core';

export const userService = {
  ...createService<User>('/users'),
  login: (username: string, password: string) =>
    httpApi.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', { username, password }),
};

export const roleService = {
  list: (params: QueryParams = {}) => paginatedQuery<Role>('/roles', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<Role, 'id'>) => httpApi.post<null>('/roles', data),
  update: (id: string, data: Partial<Role>) => httpApi.put<null>(`/roles/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/roles/${id}`),
};

export const logService = createService<SystemLog>('/system-logs');

/** 组织架构 — 正式路由 /system/departments */
export const departmentService = {
  list: () => httpApi.get<unknown[]>('/system/departments'),
  create: (data: unknown) => httpApi.post<{ id: number }>('/system/departments', data),
  update: (id: number, data: unknown) => httpApi.put<null>(`/system/departments/${id}`, data),
  delete: (id: number) => httpApi.delete<null>(`/system/departments/${id}`),
};

/** 系统配置 */
export const systemConfigService = {
  list: () => raw.get<unknown>('/system/config'),
  set: (key: string, value: string) => raw.post<null>('/system/config', { configKey: key, configValue: value }),
  logs: (params?: Record<string, unknown>) => raw.get<unknown>('/system/logs', params),
};

/** 模块配置 — 同步后端 Redis */
export const moduleService = {
  list: () => raw.get<{ id: string; name: string; status: string; priority: number }[]>('/system/modules'),
  toggle: (moduleId: string, status: string) => httpApi.put<null>('/system/modules/toggle', { moduleId, status }),
};

/** 人员管理 — 正式路由 /system/personnel */
export const personnelService = {
  list: (params: QueryParams = {}) => paginatedQuery<Personnel>('/system/personnel', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<Personnel, 'id'>) => httpApi.post<{ id: number }>('/system/personnel', data),
  update: (id: string, data: Partial<Personnel>) => httpApi.put<null>(`/system/personnel/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/system/personnel/${id}`),
};

/** 系统监控 */
export const monitorService = {
  get: () => raw.get<{
    metrics: { name: string; value: number; unit: string; status: string; trend: string; history: number[] }[];
    services: { name: string; status: string; uptime: string; version: string; pid: number; memory: string }[];
    overview: { uptime: string; dbConnections: string; deviceOnlineRate: string; qps: string };
  }>('/system/monitor'),
};
