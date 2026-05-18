import { api as httpApi } from '../client';
import type { QueryParams } from '@/types/db';

export interface KnowledgeDocRow {
  id: string;
  title: string;
  category: string;
  content: string;
  file_url: string;
  tags: string;
  view_count: number;
  status: 'active' | 'inactive';
}

export interface DocCategoryRow {
  id: string;
  name: string;
  parentId: string;
  sortOrder: number;
}

function mapKnowledgeFromApi(raw: any): KnowledgeDocRow {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    category: String(raw.category ?? ''),
    content: String(raw.content ?? ''),
    file_url: String(raw.file_url ?? ''),
    tags: String(raw.tags ?? ''),
    view_count: Number(raw.view_count ?? 0),
    status: Number(raw.status) === 1 ? 'active' : 'inactive',
  };
}

export const knowledgeService = {
  list: async (params: QueryParams = {}) => {
    const pageNum = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const res = await httpApi.get<{
      list: any[];
      total: number;
      pageNum: number;
      pageSize: number;
      pages: number;
    }>('/knowledge', {
      pageNum,
      pageSize,
      ...(params.keyword ? { keyword: String(params.keyword) } : {}),
      ...(params.category ? { category: String(params.category) } : {}),
    });
    if (res.code !== 200 || !res.data) {
      return {
        code: res.code,
        message: (res as { msg?: string; message?: string }).msg ?? (res as { message?: string }).message ?? 'error',
        data: { list: [], total: 0, page: pageNum, pageSize, totalPages: 0 },
        timestamp: Date.now(),
      };
    }
    const d = res.data;
    const list = Array.isArray(d.list) ? d.list.map(mapKnowledgeFromApi) : [];
    const ps = d.pageSize ?? pageSize;
    const denom = ps || 1;
    return {
      code: 200,
      message: 'ok',
      data: {
        list,
        total: d.total ?? list.length,
        page: d.pageNum ?? pageNum,
        pageSize: ps,
        totalPages: d.pages ?? Math.max(1, Math.ceil((d.total ?? 0) / denom)),
      },
      timestamp: Date.now(),
    };
  },
  create: (data: Record<string, unknown>) =>
    httpApi.post('/knowledge', {
      title: data.title,
      category: data.category || '未分类',
      content: data.content || '',
      file_url: data.file_url || '',
      tags: data.tags || '',
      status: data.status === 'active' ? 1 : 0,
    }),
  update: (id: string, data: Record<string, unknown>) => {
    const body: Record<string, unknown> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.category !== undefined) body.category = data.category;
    if (data.content !== undefined) body.content = data.content;
    if (data.file_url !== undefined) body.file_url = data.file_url;
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.status !== undefined) body.status = data.status === 'active' ? 1 : 0;
    return httpApi.put(`/knowledge/${id}`, body);
  },
  delete: (id: string) => httpApi.delete(`/knowledge/${id}`),

  categories: () => httpApi.get<DocCategoryRow[] | string[]>('/knowledge/categories'),
  categoryList: (params: QueryParams = {}) => httpApi.get<{ list: DocCategoryRow[]; total: number }>('/knowledge/categories/list', params),
  categoryCreate: (data: Omit<DocCategoryRow, 'id'>) => httpApi.post('/knowledge/categories', data),
  categoryUpdate: (id: string, data: Partial<DocCategoryRow>) => httpApi.put(`/knowledge/categories/${id}`, data),
  categoryDelete: (id: string) => httpApi.delete(`/knowledge/categories/${id}`),

  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return httpApi.post<{ url: string; originalName: string; size: number }>('/knowledge/upload', form as any);
  },
};
