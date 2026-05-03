import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { legacyApi as api } from '@/api/services';
import type { UserInfo } from '@/types';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'sfp_token';
const REFRESH_KEY = 'sfp_refreshToken';
const USER_INFO_KEY = 'sfp_userInfo';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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
      const data = await api.login(username, password);
      // 后端返回 { accessToken, refreshToken, user }
      const accessToken = (data as any).accessToken || (data as any).token;
      const refreshToken = (data as any).refreshToken;
      const userInfo = (data as any).user || (data as any).userInfo;
      if (!accessToken) throw new Error('登录响应缺少 accessToken');
      localStorage.setItem(TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
      if (userInfo != null) {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
        setUser(userInfo as UserInfo);
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

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
