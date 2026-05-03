/**
 * ═══════════════════════════════════════════════════════════════════
 * API 统一客户端 - HTTP请求封装 + Mock拦截 + 请求取消 + Token自动刷新
 * ═══════════════════════════════════════════════════════════════════
 */
import type { ApiResponse, PaginatedData, QueryParams } from '@/types/db';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'; // 默认关闭Mock，仅显式开启时启用

/* ───── Token 存储键 ───── */
const TOKEN_KEY = 'sfp_token';           // access_token（向后兼容）
const REFRESH_KEY = 'sfp_refreshToken';  // refresh_token

/* ───── Token 刷新状态 ───── */
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/* ───── 延迟模拟 ───── */
function mockDelay(ms = 300): Promise<void> {
  return new Promise(r => setTimeout(r, ms + Math.random() * 200));
}

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

/* ───── 跳转到登录页 ───── */
function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    const redirect = encodeURIComponent(window.location.hash);
    window.location.href = redirect ? `/login?redirect=${redirect}` : '/login';
  }
}

/* ───── Token 刷新 ───── */
async function doRefresh(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    redirectToLogin();
    throw new Error('refreshToken 不存在');
  }

  try {
    const resp = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const result = await resp.json() as ApiResponse<{ accessToken: string; refreshToken: string }>;

    if (result.code !== 200 || !result.data?.accessToken) {
      throw new Error(result.message || 'Token 刷新失败');
    }

    const newRefresh = result.data.refreshToken ?? refreshToken;
    setTokens(result.data.accessToken, newRefresh);
    console.log('[API] Token 刷新成功');
  } catch (err: any) {
    console.error('[API] Token 刷新失败:', err.message);
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

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function requestWithRetry<T>(
  method: string, url: string, body?: unknown, signal?: AbortSignal, retries = 0
): Promise<ApiResponse<T>> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

  if (USE_MOCK) {
    const { mockHandler } = await import('./mock');
    await mockDelay();
    return mockHandler(method, url, body) as any;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const resp = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    // ── 401 处理：尝试自动刷新 Token ──
    if (resp.status === 401 && !url.startsWith('/auth')) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        // 没有 refreshToken，直接跳转登录页
        clearTokens();
        redirectToLogin();
        throw new Error('登录已过期');
      }

      // 等待刷新完成（如果有其他请求正在刷新，则排队等待）
      try {
        await triggerRefresh();
      } catch {
        // 刷新失败，已在上层处理（清除token + 跳转）
        throw new Error('Token 刷新失败，请重新登录');
      }

      // 使用新 token 重试原请求
      const newToken = getAccessToken();
      const retryHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`;

      const retryResp = await fetch(fullUrl, {
        method,
        headers: retryHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });

      if (retryResp.status === 401) {
        // 重试后仍然 401，说明 refreshToken 也失效了
        clearTokens();
        redirectToLogin();
        throw new Error('登录已过期，请重新登录');
      }

      // 重试成功，继续处理响应
      const retryResult = await retryResp.json() as ApiResponse<T>;
      const retryMsg = (retryResult as any).message || (retryResult as any).msg || '请求失败';
      if (retryResult.code !== 200) throw new Error(retryMsg);
      return retryResult;
    }

    // 404/502 时自动 fallback 到 Mock，支持渐进式真实化
    if ((resp.status === 404 || resp.status === 502) && !url.startsWith('/auth')) {
      console.warn(`[API] ${method} ${url} 返回 ${resp.status}，fallback 到 Mock`);
      const { mockHandler } = await import('./mock');
      await mockDelay();
      return mockHandler(method, url, body) as any;
    }

    let result: ApiResponse<T>;
    try {
      result = await resp.json() as ApiResponse<T>;
    } catch {
      throw new Error('服务器返回非 JSON 响应');
    }
    // 兼容后端 msg / message 字段
    const msg = (result as any).message || (result as any).msg || '请求失败';
    if (result.code !== 200) {
      // 后端可能用 200 HTTP 状态码包装 404 业务码，此时也 fallback 到 Mock
      const isNotFound = result.code === 404 || /不存在|未找到|not found/i.test(msg);
      if (isNotFound && !url.startsWith('/auth')) {
        console.warn(`[API] ${method} ${url} 返回业务码 ${result.code}，fallback 到 Mock`);
        const { mockHandler } = await import('./mock');
        await mockDelay();
        return mockHandler(method, url, body) as any;
      }
      throw new Error(msg);
    }
    return result;
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    // 网络错误 / 超时 → 重试（用户主动取消不重试）
    const isNetworkError =
      err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('timeout');
    const isRetryable = isNetworkError && retries < MAX_RETRIES && !url.startsWith('/auth');

    if (isRetryable) {
      console.warn(`[API] ${method} ${url} 请求失败，${retries + 1}/${MAX_RETRIES + 1} 次重试...`, err.message);
      await sleep(RETRY_DELAY * (retries + 1));
      return requestWithRetry(method, url, body, signal, retries + 1);
    }

    // 网络错误也 fallback 到 Mock（最后一次重试仍失败时）
    if (isNetworkError && !url.startsWith('/auth')) {
      console.warn(`[API] ${method} ${url} 网络错误，fallback 到 Mock:`, err.message);
      const { mockHandler } = await import('./mock');
      await mockDelay();
      return mockHandler(method, url, body) as any;
    }
    throw err;
  }
}

async function request<T>(method: string, url: string, body?: unknown, signal?: AbortSignal): Promise<ApiResponse<T>> {
  return requestWithRetry(method, url, body, signal, 0);
}

/* ───── 工具：拼接 query string ───── */
export function buildUrl(url: string, params?: Record<string, any>): string {
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
  get: <T>(url: string, params?: Record<string, any>, signal?: AbortSignal) => request<T>('GET', buildUrl(url, params), undefined, signal),
  post: <T>(url: string, body?: unknown, signal?: AbortSignal) => request<T>('POST', url, body, signal),
  put: <T>(url: string, body?: unknown, signal?: AbortSignal) => request<T>('PUT', url, body, signal),
  patch: <T>(url: string, body?: unknown, signal?: AbortSignal) => request<T>('PATCH', url, body, signal),
  delete: <T>(url: string, signal?: AbortSignal) => request<T>('DELETE', url, undefined, signal),
};

/* ───── RAW API（自动解包 .data，供旧体系兼容层使用） ───── */
export const raw = {
  get: async <T = any>(url: string, params?: Record<string, any>, signal?: AbortSignal) => (await request<T>('GET', buildUrl(url, params), undefined, signal)).data,
  post: async <T = any>(url: string, body?: unknown, signal?: AbortSignal) => (await request<T>('POST', url, body, signal)).data,
  put: async <T = any>(url: string, body?: unknown, signal?: AbortSignal) => (await request<T>('PUT', url, body, signal)).data,
  patch: async <T = any>(url: string, body?: unknown, signal?: AbortSignal) => (await request<T>('PATCH', url, body, signal)).data,
  delete: async <T = any>(url: string, signal?: AbortSignal) => (await request<T>('DELETE', url, undefined, signal)).data,
};

/* ───── LEGACY RAW API（旧体系专用，mock 模式下直接走 legacyMockData） ───── */
function legacyPath(url: string) {
  // 去掉 query string，legacyMockData 只匹配 path
  return url.split('?')[0];
}
export const legacyRaw = {
  get: async <T = any>(url: string, params?: Record<string, any>) => {
    const fullUrl = buildUrl(url, params);
    if (USE_MOCK) {
      const { legacyMockData } = await import('./legacyMockData');
      await mockDelay();
      const data = legacyMockData(legacyPath(fullUrl), 'GET');
      if (data !== undefined) return data as T;
      // fallback 到 mockHandler（IndexedDB DAO）
      return raw.get<T>(url, params);
    }
    return raw.get<T>(url, params);
  },
  post: async <T = any>(url: string, body?: unknown) => {
    if (USE_MOCK) {
      const { legacyMockData } = await import('./legacyMockData');
      await mockDelay();
      const data = legacyMockData(legacyPath(url), 'POST', body);
      if (data !== undefined) return data as T;
      return raw.post<T>(url, body);
    }
    return raw.post<T>(url, body);
  },
  put: async <T = any>(url: string, body?: unknown) => {
    if (USE_MOCK) {
      const { legacyMockData } = await import('./legacyMockData');
      await mockDelay();
      const data = legacyMockData(legacyPath(url), 'PUT', body);
      if (data !== undefined) return data as T;
      return raw.put<T>(url, body);
    }
    return raw.put<T>(url, body);
  },
  patch: async <T = any>(url: string, body?: unknown) => {
    if (USE_MOCK) {
      const { legacyMockData } = await import('./legacyMockData');
      await mockDelay();
      const data = legacyMockData(legacyPath(url), 'PATCH', body);
      if (data !== undefined) return data as T;
      return raw.patch<T>(url, body);
    }
    return raw.patch<T>(url, body);
  },
  delete: async <T = any>(url: string) => {
    if (USE_MOCK) {
      const { legacyMockData } = await import('./legacyMockData');
      await mockDelay();
      const data = legacyMockData(legacyPath(url), 'DELETE');
      if (data !== undefined) return data as T;
      return raw.delete<T>(url);
    }
    return raw.delete<T>(url);
  },
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
