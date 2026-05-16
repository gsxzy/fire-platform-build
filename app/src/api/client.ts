/**
 * ═══════════════════════════════════════════════════════════════════
 * API 统一客户端 - HTTP请求封装 + 请求取消 + Token自动刷新
 * ═══════════════════════════════════════════════════════════════════
 */
import type { ApiResponse, PaginatedData, QueryParams } from '@/types/db';
import { ApiClientError, getApiEnvelopeMessage } from '@/types/api';
import { logger } from '@/lib/logger';

export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/* ───── Token 存储键 ───── */
export const TOKEN_KEY = 'sfp_token';
export const REFRESH_KEY = 'sfp_refreshToken';

/* ───── Token 刷新状态 ───── */
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/* ───── 获取当前 accessToken ───── */
function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/* ───── 获取当前 refreshToken ───── */
function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

/* ───── 更新双 Token ───── */
function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

/* ───── 清除 Token ───── */
function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem('sfp_userInfo');
}

/* ───── 跳转到登录页（HashRouter 兼容） ───── */
function redirectToLogin() {
  const hash = window.location.hash;
  if (!hash.startsWith('#/login')) {
    // 去掉 # 前缀，确保 redirect 是纯路径（如 /monitor/realtime）
    const redirect = encodeURIComponent(hash.replace(/^#/, ''));
    window.location.hash = redirect ? `#/login?redirect=${redirect}` : '#/login';
  }
}

/* ───── Token 刷新 ───── */
async function doRefresh(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    redirectToLogin();
    throw new ApiClientError('refreshToken 不存在', 401);
  }

  try {
    const resp = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const result = await resp.json() as ApiResponse<{ accessToken: string; refreshToken: string }>;

    if (result.code !== 200 || !result.data?.accessToken) {
      throw new ApiClientError(getApiEnvelopeMessage(result, 'Token 刷新失败'), result.code || 401);
    }

    const newRefresh = result.data.refreshToken ?? refreshToken;
    setTokens(result.data.accessToken, newRefresh);
    logger.info('[API] Token 刷新成功');
  } catch (err: unknown) {
    logger.error('[API] Token 刷新失败:', err instanceof Error ? err.message : err);
    clearTokens();
    redirectToLogin();
    throw err;
  }
}

/* ───── 触发刷新（带队列） ───── */
async function triggerRefresh(): Promise<void> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = doRefresh().finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });
  }
  if (refreshPromise) {
    await refreshPromise;
  }
}

/* ───── 重试配置 ───── */
const MAX_RETRIES = 2;
const RETRY_DELAY = 800;
const REQUEST_TIMEOUT = 15000; // 15 秒超时

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

/** 组合外部 signal 与超时，并在 finally 中调用 cleanup 释放定时器 */
function withTimeout(externalSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => {
    clearTimeout(timer);
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const cleanup = () => {
    clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  };

  return { signal: controller.signal, cleanup };
}

async function requestWithRetry<T>(
  method: string, url: string, body?: unknown, signal?: AbortSignal, retries = 0
): Promise<ApiResponse<T>> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const { signal: timeoutSignal, cleanup: cleanupTimeout } = withTimeout(signal, REQUEST_TIMEOUT);

  try {
    const resp = await fetch(fullUrl, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      signal: timeoutSignal,
    });

    // ── 401 处理：尝试自动刷新 Token ──
    if (resp.status === 401 && !url.startsWith('/auth')) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        // 没有 refreshToken，直接跳转登录页
        clearTokens();
        redirectToLogin();
        throw new ApiClientError('登录已过期', 401);
      }

      // 等待刷新完成（如果有其他请求正在刷新，则排队等待）
      try {
        await triggerRefresh();
      } catch {
        // 刷新失败，已在上层处理（清除token + 跳转）
        throw new ApiClientError('Token 刷新失败，请重新登录', 401);
      }

      // 使用新 token 重试原请求
      const newToken = getAccessToken();
      const retryHeaders: Record<string, string> = {};
      if (!isFormData) retryHeaders['Content-Type'] = 'application/json';
      if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`;

      const retryResp = await fetch(fullUrl, {
        method,
        headers: retryHeaders,
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
        signal,
      });

      if (retryResp.status === 401) {
        // 重试后仍然 401，说明 refreshToken 也失效了
        clearTokens();
        redirectToLogin();
        throw new ApiClientError('登录已过期，请重新登录', 401);
      }

      // 重试成功，继续处理响应
      const retryResult = await retryResp.json() as ApiResponse<T>;
      const retryMsg = getApiEnvelopeMessage(retryResult, '请求失败');
      if (retryResult.code !== 200) throw new ApiClientError(retryMsg, retryResult.code);
      return retryResult;
    }

    // 404/502 时不再静默 fallback 到 Mock（生产环境应避免使用虚假数据）
    if ((resp.status === 404 || resp.status === 502) && !url.startsWith('/auth')) {
      logger.error(`[API] ${method} ${url} 返回 ${resp.status}，后端接口异常，请检查服务状态`);
      throw new ApiClientError(`后端接口 ${url} 返回 ${resp.status}，请检查后端服务是否正常运行`, resp.status);
    }

    let result: ApiResponse<T>;
    try {
      result = await resp.json() as ApiResponse<T>;
    } catch {
      throw new ApiClientError('服务器返回非 JSON 响应', resp.status || 502, resp.status);
    }
    const msg = getApiEnvelopeMessage(result, '请求失败');
    if (result.code !== 200) {
      throw new ApiClientError(msg, result.code);
    }
    return result;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    const errName = err instanceof Error ? err.name : '';
    const errMessage = err instanceof Error ? err.message : String(err);
    // 网络错误 / 超时 → 重试（用户主动取消不重试）
    const isNetworkError =
      errName === 'TypeError' || errMessage.includes('fetch') || errMessage.includes('timeout');
    const isRetryable = isNetworkError && retries < MAX_RETRIES && !url.startsWith('/auth');

    if (isRetryable) {
      logger.warn(`[API] ${method} ${url} 请求失败，${retries + 1}/${MAX_RETRIES + 1} 次重试...`, errMessage);
      await sleep(RETRY_DELAY * (retries + 1));
      return requestWithRetry(method, url, body, signal, retries + 1);
    }

    // 网络错误不再 fallback 到 Mock（生产环境应避免使用虚假数据）
    if (isNetworkError && !url.startsWith('/auth')) {
      logger.error(`[API] ${method} ${url} 网络错误，无法连接到后端:`, errMessage);
      throw new ApiClientError(`网络错误，无法连接到后端 (${url})`, 0);
    }
    throw err;
  } finally {
    cleanupTimeout();
  }
}

async function request<T>(method: string, url: string, body?: unknown, signal?: AbortSignal): Promise<ApiResponse<T>> {
  return requestWithRetry(method, url, body, signal, 0);
}

/* ───── 工具：拼接 query string（值经 String 序列化，兼容分页与筛选） ───── */
export function buildUrl(url: string, params?: Record<string, unknown>): string {
  if (!params) return url;
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const query = qs.toString();
  return query ? `${url}?${query}` : url;
}

/* ───── API方法（返回 ApiResponse<T>，供新体系使用） ───── */
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>, signal?: AbortSignal) => request<T>('GET', buildUrl(url, params), undefined, signal),
  post: <T>(url: string, body?: unknown, signal?: AbortSignal) => request<T>('POST', url, body, signal),
  put: <T>(url: string, body?: unknown, signal?: AbortSignal) => request<T>('PUT', url, body, signal),
  patch: <T>(url: string, body?: unknown, signal?: AbortSignal) => request<T>('PATCH', url, body, signal),
  delete: <T>(url: string, signal?: AbortSignal) => request<T>('DELETE', url, undefined, signal),
};

/* ───── RAW API（自动解包 .data，供旧体系兼容层使用） ───── */
export const raw = {
  get: async <T = any>(url: string, params?: Record<string, unknown>, signal?: AbortSignal) => (await request<T>('GET', buildUrl(url, params), undefined, signal)).data,
  post: async <T = any>(url: string, body?: unknown, signal?: AbortSignal) => (await request<T>('POST', url, body, signal)).data,
  put: async <T = any>(url: string, body?: unknown, signal?: AbortSignal) => (await request<T>('PUT', url, body, signal)).data,
  patch: async <T = any>(url: string, body?: unknown, signal?: AbortSignal) => (await request<T>('PATCH', url, body, signal)).data,
  delete: async <T = any>(url: string, signal?: AbortSignal) => (await request<T>('DELETE', url, undefined, signal)).data,
};

/* ───── LEGACY RAW API（旧体系专用） ───── */
export const legacyRaw = {
  get: async <T = any>(url: string, params?: Record<string, unknown>) => raw.get<T>(url, params),
  post: async <T = any>(url: string, body?: unknown) => raw.post<T>(url, body),
  put: async <T = any>(url: string, body?: unknown) => raw.put<T>(url, body),
  patch: async <T = any>(url: string, body?: unknown) => raw.patch<T>(url, body),
  delete: async <T = any>(url: string) => raw.delete<T>(url),
};

/* ───── 可取消请求辅助 ───── */
export function createCancelableRequest<T>(
  executor: (signal: AbortSignal) => Promise<T>
): { promise: Promise<T>; cancel: () => void } {
  const controller = new AbortController();
  const promise = executor(controller.signal);
  return {
    promise,
    cancel: () => controller.abort(),
  };
}

/* ───── 分页查询辅助 ───── */
export async function paginatedQuery<T>(
  endpoint: string,
  params: QueryParams
): Promise<ApiResponse<PaginatedData<T>>> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) query.set(k, String(v));
  });
  const url = `${endpoint}?${query.toString()}`;
  return api.get<PaginatedData<T>>(url);
}