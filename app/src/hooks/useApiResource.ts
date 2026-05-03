import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/core/ToastContext';

export interface QueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | undefined;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface ApiService<T = unknown> {
  list: (params: QueryParams) => Promise<ApiResponse<PaginatedResult<T>>>;
  create?: (data: unknown) => Promise<ApiResponse<unknown>>;
  update?: (id: string, data: unknown) => Promise<ApiResponse<unknown>>;
  delete?: (id: string) => Promise<ApiResponse<unknown>>;
}

export interface UseApiResourceOptions<T = unknown> {
  service: ApiService<T>;
  defaultPageSize?: number;
  autoLoad?: boolean;
  initialFilters?: Record<string, unknown>;
}

export function useApiResource<T = unknown>(options: UseApiResourceOptions<T>) {
  const { success, error: showError } = useToast();
  const { service, defaultPageSize = 10, autoLoad = true, initialFilters = {} } = options;

  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(defaultPageSize);
  const [keyword, setKeywordState] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Record<string, unknown>>(initialFilters);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: QueryParams = {
        page,
        pageSize,
        ...(keyword ? { keyword } : {}),
        ...(sortKey ? { sortBy: sortKey, sortOrder: sortDir } : {}),
        ...filters,
      };
      const res = await service.list(params);
      if (!res || res.code !== 200) throw new Error(res?.message || '请求失败');
      const result = res.data || { list: [], total: 0, page, pageSize, totalPages: 0 };
      setData(result.list);
      setTotal(result.total);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '数据加载出错，请检查网络';
      showError('加载失败', msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, sortKey, sortDir, filters, service, showError]);

  useEffect(() => {
    if (autoLoad) fetchList();
  }, [fetchList, autoLoad]);

  const setKeyword = (kw: string) => {
    setKeywordState(kw);
    setPage(1);
  };

  const setActiveFilters = (f: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)) => {
    setFilters(prev => (typeof f === 'function' ? f(prev) : f));
    setPage(1);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleCreate = async (values: Omit<T, 'id'>) => {
    if (!service.create) return false;
    try {
      const res = await service.create(values);
      if (!res || res.code !== 200) throw new Error(res?.message || '新增失败');
      success('新增成功');
      setPage(1);
      await fetchList();
      return true;
    } catch (e: unknown) {
      showError('新增失败', e instanceof Error ? e.message : '新增失败');
      return false;
    }
  };

  const handleUpdate = async (id: string, values: Partial<T>) => {
    if (!service.update) return false;
    try {
      const res = await service.update(id, values);
      if (!res || res.code !== 200) throw new Error(res?.message || '保存失败');
      success('保存成功');
      await fetchList();
      return true;
    } catch (e: unknown) {
      showError('保存失败', e instanceof Error ? e.message : '保存失败');
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    if (!service.delete) return false;
    try {
      const res = await service.delete(id);
      if (!res || res.code !== 200) throw new Error(res?.message || '删除失败');
      success('删除成功');
      await fetchList();
      return true;
    } catch (e: unknown) {
      showError('删除失败', e instanceof Error ? e.message : '删除失败');
      return false;
    }
  };

  const refresh = () => fetchList();

  return {
    data,
    total,
    page,
    pageSize,
    keyword,
    setKeyword,
    sortKey,
    sortDir,
    toggleSort,
    loading,
    filters,
    setActiveFilters,
    setPage,
    refresh,
    create: handleCreate,
    update: handleUpdate,
    delete: handleDelete,
  };
}
