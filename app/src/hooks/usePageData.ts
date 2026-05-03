import { useState, useEffect, useCallback } from 'react';

interface UsePageDataOptions<T> {
  fetcher: () => Promise<T>;
  initialData?: T;
  autoLoad?: boolean;
}

interface UsePageDataResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * 通用页面数据加载 Hook
 * 统一处理 loading / error / refresh 状态
 */
export function usePageData<T>({
  fetcher,
  initialData,
  autoLoad = true,
}: UsePageDataOptions<T>): UsePageDataResult<T> {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (autoLoad) load();
  }, [load, autoLoad]);

  return { data, loading, error, refresh: load };
}
