// Axios client + auth interceptor. Same shape as the web portal's
// frontend/src/services/api.ts so the two surfaces feel symmetric.
import axios, { InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// Defaults to the production backend. Override via EXPO_PUBLIC_API_URL in
// .env / .env.local when developing against a local server.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hospital-c3k5.vercel.app';

export const api = axios.create({ baseURL: API_URL });

const ACCESS_KEY = 'auth.access';
const REFRESH_KEY = 'auth.refresh';

export const tokens = {
  async getAccess() { return SecureStore.getItemAsync(ACCESS_KEY); },
  async getRefresh() { return SecureStore.getItemAsync(REFRESH_KEY); },
  async set(access: string, refresh: string) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, access),
      SecureStore.setItemAsync(REFRESH_KEY, refresh),
    ]);
  },
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => undefined),
      SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined),
    ]);
  },
};

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokens.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → try refresh once, then bubble. The mobile auth store catches the
// final failure and routes the user back to the login screen.
let refreshPromise: Promise<string | null> | null = null;
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refresh = await tokens.getRefresh();
      if (!refresh) return null;
      const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken: refresh });
      const newAccess = res.data?.token;
      const newRefresh = res.data?.refreshToken || refresh;
      if (!newAccess) return null;
      await tokens.set(newAccess, newRefresh);
      return newAccess;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    if (status === 401 && original && !original._retry && !String(original.url || '').includes('/auth/login')) {
      original._retry = true;
      const fresh = await refreshAccessToken();
      if (fresh) {
        original.headers = { ...(original.headers || {}), Authorization: `Bearer ${fresh}` };
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);

export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/api/mobile/v1/auth/login', { username, password, platform: 'ios' }),
  logout: () => api.post('/api/auth/logout').catch(() => undefined),
};

export const patientsAPI = {
  getMyHome: () => api.get('/api/mobile/v1/patients/me'),
  updateMyProfile: (data: any) => api.patch('/api/mobile/v1/patients/me', data),
};

export const appointmentsAPI = {
  listMine: () => api.get('/api/mobile/v1/appointments/me'),
  doctors: () => api.get('/api/mobile/v1/appointments/doctors'),
  slots: (doctorId: string, date: string) =>
    api.get('/api/mobile/v1/appointments/slots', { params: { doctorId, date } }),
  book: (data: { doctorId: string; appointmentDate: string; appointmentTime: string; type?: string; reason?: string }) =>
    api.post('/api/mobile/v1/appointments', data),
  cancel: (id: string, reason?: string) =>
    api.post(`/api/mobile/v1/appointments/${id}/cancel`, { reason }),
};
