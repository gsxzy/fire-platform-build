import { api } from '../client';

export interface LoginResult {
  accessToken: string;
  refreshToken?: string;
  user?: unknown;
  token?: string;
}

export const authService = {
  login: (username: string, password: string) =>
    api.post<LoginResult>('/auth/login', { username, password }),

  register: (username: string, password: string, realName?: string, phone?: string) =>
    api.post<unknown>('/auth/register', { username, password, realName, phone }),

  logout: () => api.post<null>('/auth/logout', {}),

  profile: () => api.get<unknown>('/auth/profile'),

  updateProfile: (data: unknown) => api.put<null>('/auth/profile', data),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.put<null>('/auth/password', { oldPassword, newPassword }),
};
