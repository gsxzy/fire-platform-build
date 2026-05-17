import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/core/ToastContext';
import { getErrorMessage } from '@/types/api';

export interface UseAsyncRequestOptions {
  /** 失败时 toast 标题 */
  errorTitle?: string;
  /** 成功时 toast（可选） */
  successMessage?: string;
  /** 是否自动执行 */
  immediate?: boolean;
}

/**
 * 统一异步请求状态与错误处理（列表外的单次加载/提交）
 */
export function useAsyncRequest<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
  options: UseAsyncRequestOptions = {}
) {
  const { error: showError, success: showSuccess } = useToast();
  const { errorTitle = '操作失败', successMessage, immediate = false } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (): Promise<T | null> => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current(controller.signal);
      setData(result);
      if (successMessage) showSuccess(successMessage);
      return result;
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      setError(msg);
      showError(errorTitle, msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [errorTitle, successMessage, showError, showSuccess]);

  useEffect(() => {
    if (immediate) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps 由调用方控制触发时机
  }, deps);

  return { data, loading, error, run, setData };
}
