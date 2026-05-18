/**
 * 工作台服务层（待办 + 公告）
 */
import { raw } from '../client';

export const workbenchService = {
  /* ── 首页概览 ── */
  overview: () => raw.get<Record<string, unknown>>('/workbench/overview'),

  /* ── 待办 ── */
  todoList: (params?: { status?: number; keyword?: string; page?: number; pageSize?: number }) =>
    raw.get<Record<string, unknown>>('/workbench/todos', params),
  todoPendingCount: () => raw.get<{ count: number }>('/workbench/todos/pending-count'),
  todoById: (id: number) => raw.get<Record<string, unknown>>(`/workbench/todos/${id}`),
  todoCreate: (body: Record<string, unknown>) => raw.post<Record<string, unknown>>('/workbench/todos', body),
  todoUpdate: (id: number, body: Record<string, unknown>) => raw.put<Record<string, unknown>>(`/workbench/todos/${id}`, body),
  todoDelete: (id: number) => raw.delete<unknown>(`/workbench/todos/${id}`),

  /* ── 公告 ── */
  noticeList: (params?: { type?: string; status?: number; keyword?: string; page?: number; pageSize?: number }) =>
    raw.get<Record<string, unknown>>('/workbench/notices', params),
  noticeById: (id: number) => raw.get<Record<string, unknown>>(`/workbench/notices/${id}`),
  noticeCreate: (body: Record<string, unknown>) => raw.post<Record<string, unknown>>('/workbench/notices', body),
  noticeUpdate: (id: number, body: Record<string, unknown>) => raw.put<Record<string, unknown>>(`/workbench/notices/${id}`, body),
  noticeDelete: (id: number) => raw.delete<unknown>(`/workbench/notices/${id}`),
};
