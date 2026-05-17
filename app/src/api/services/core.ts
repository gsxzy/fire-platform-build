/**
 * ═══════════════════════════════════════════════════════════════════
 * API 服务核心工厂
 * ═══════════════════════════════════════════════════════════════════
 */
import { api as httpApi, paginatedQuery } from '../client';
import type { QueryParams } from '@/types/db';

export function createService<T extends { id: string }>(endpoint: string) {
  return {
    list: (params: QueryParams = {}) => paginatedQuery<T>(`${endpoint}/list`, params),
    get: (id: string) => httpApi.get<T>(`${endpoint}/${id}`),
    create: (data: Omit<T, 'id'>) => httpApi.post<null>(endpoint, data),
    update: (id: string, data: Partial<T>) => httpApi.put<null>(`${endpoint}/${id}`, data),
    patch: (id: string, data: Partial<T>) => httpApi.patch<null>(`${endpoint}/${id}`, data),
    delete: (id: string) => httpApi.delete<null>(`${endpoint}/${id}`),
  };
}
