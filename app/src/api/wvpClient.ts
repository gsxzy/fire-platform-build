/**
 * ═══════════════════════════════════════════════════════════════════
 * WVP-PRO API 客户端 - 对接真实 GB28181 流媒体服务器
 * ═══════════════════════════════════════════════════════════════════
 */

const WVP_BASE = '/wvp';

let wvpToken: string | null = null;

function getWvpToken(): string | null {
  if (!wvpToken) {
    wvpToken = localStorage.getItem('sfp_wvp_token');
  }
  return wvpToken;
}

function setWvpToken(token: string) {
  wvpToken = token;
  localStorage.setItem('sfp_wvp_token', token);
}

function clearWvpToken() {
  wvpToken = null;
  localStorage.removeItem('sfp_wvp_token');
}

/* ───── WVP 响应格式 ───── */
export interface WvpResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

/* ───── HTTP 请求 ───── */
async function ensureWvpLogin(): Promise<void> {
  if (getWvpToken()) return;
  const username = import.meta.env.VITE_WVP_USERNAME;
  if (!username) {
    throw new Error('[WVP] 错误：未设置 VITE_WVP_USERNAME 环境变量');
  }
  const password = import.meta.env.VITE_WVP_PASSWORD;
  if (!password) {
    throw new Error('[WVP] 错误：未设置 VITE_WVP_PASSWORD 环境变量');
  }
  await wvpLogin(username, password);
}

async function wvpRequest<T>(
  method: string,
  url: string,
  body?: unknown,
  params?: Record<string, any>
): Promise<WvpResponse<T>> {
  await ensureWvpLogin();

  const fullUrl = url.startsWith('http') ? url : `${WVP_BASE}${url}`;
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : '';
  const targetUrl = `${fullUrl}${qs}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getWvpToken();
  if (token) headers['access-token'] = token;

  const resp = await fetch(targetUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const result = (await resp.json()) as WvpResponse<T>;

  if (result.code === 401) {
    clearWvpToken();
    // 尝试重新登录一次
    await ensureWvpLogin();
    return wvpRequest(method, url, body, params);
  }
  if (result.code !== 0 && result.code !== 200) {
    throw new Error(result.msg || 'WVP请求失败');
  }
  return result;
}

/* ───── WVP 登录 ───── */
export async function wvpLogin(username: string, password: string): Promise<string> {
  const targetUrl = `${WVP_BASE}/api/user/login?${new URLSearchParams({ username, password }).toString()}`;
  const resp = await fetch(targetUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  const result = (await resp.json()) as WvpResponse<{
    accessToken: string;
    serverId: string;
    id: number;
    username: string;
  }>;
  if (result.code !== 0 && result.code !== 200) {
    throw new Error(result.msg || 'WVP登录失败');
  }
  const token = result.data.accessToken;
  setWvpToken(token);
  return token;
}

/* ───── 导出请求方法 ───── */
export const wvp = {
  get: <T>(url: string, params?: Record<string, any>) => wvpRequest<T>('GET', url, undefined, params),
  post: <T>(url: string, body?: unknown, params?: Record<string, any>) => wvpRequest<T>('POST', url, body, params),
  put: <T>(url: string, body?: unknown) => wvpRequest<T>('PUT', url, body),
  patch: <T>(url: string, body?: unknown) => wvpRequest<T>('PATCH', url, body),
  delete: <T>(url: string) => wvpRequest<T>('DELETE', url),
};

export { getWvpToken, setWvpToken, clearWvpToken };
