import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { authService } from '@/api/services';
import { TOKEN_KEY, REFRESH_KEY, API_BASE } from '@/api/client';
import type { UserInfo } from '@/types';
import { ApiClientError } from '@/types/api';

function mapLoginUserToUserInfo(raw: unknown): UserInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Record<string, unknown>;
  const idRaw = u.id ?? u.userId;
  // 兼容 number（自增 ID）和 string（UUID）
  const userId: number | string =
    typeof idRaw === 'number' ? idRaw
    : typeof idRaw === 'string' ? idRaw
    : '';
  const username = typeof u.username === 'string' ? u.username : '';
  const realName =
    typeof u.realName === 'string' ? u.realName
    : typeof u.real_name === 'string' ? u.real_name
    : username;
  let roles: string[] = [];
  if (Array.isArray(u.roles)) {
    roles = u.roles.filter((x): x is string => typeof x === 'string');
  } else if (typeof u.roles === 'string') {
    roles = [u.roles];
  }
  const permissions = Array.isArray(u.permissions)
    ? u.permissions.filter((x): x is string => typeof x === 'string')
    : [];
  const avatar = typeof u.avatar === 'string' ? u.avatar : null;
  if ((!userId && userId !== 0) || !username) return null;
  return { userId, username, realName, avatar, roles, permissions };
}

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_INFO_KEY = 'sfp_userInfo';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => {
    try {
      const stored = localStorage.getItem(USER_INFO_KEY);
      if (!stored || stored === 'undefined' || stored === 'null') return null;
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const envelope = await authService.login(username, password);
      const data = envelope.data;
      if (!data || typeof data !== 'object') {
        throw new ApiClientError('登录响应格式错误', 502);
      }
      const o = data as unknown as Record<string, unknown>;
      const accessToken =
        typeof o.accessToken === 'string' ? o.accessToken
        : typeof o.token === 'string' ? o.token
        : '';
      if (!accessToken) {
        throw new ApiClientError('登录响应缺少 accessToken', 502);
      }
      const refreshToken = typeof o.refreshToken === 'string' ? o.refreshToken : undefined;
      const mapped = mapLoginUserToUserInfo(o.user ?? o.userInfo);
      localStorage.setItem(TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
      if (mapped) {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(mapped));
        setUser(mapped);
      } else {
        localStorage.removeItem(USER_INFO_KEY);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const accessToken = localStorage.getItem(TOKEN_KEY);
    try {
      // 调用后端登出接口，销毁 refreshToken
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
    } catch (err) {
      console.warn('[Auth] 后端登出调用失败:', err);
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading
  }), [user, login, logout, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
