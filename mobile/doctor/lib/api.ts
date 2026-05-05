// Same axios + interceptor pattern as the patient app. Kept as a separate
// copy (not a shared package) so each app can evolve its API surface
// independently without an import dance. If the two clients drift, we'll
// extract a shared `mobile/lib-shared/` workspace package.
import axios, { InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

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

export const scheduleAPI = {
  // Today's schedule = appointments for the logged-in doctor today + any
  // surgeries the doctor is on. Backend filters by req.user.userId.
  appointments: (params?: { date?: string }) => api.get('/api/appointments', { params }),
  surgeries: () => api.get('/api/surgeries'),
};

export const patientsAPI = {
  list: (params?: { search?: string; limit?: number }) => api.get('/api/patients', { params }),
  byId: (id: string) => api.get(`/api/patients/${id}`),
};

export const drugsAPI = {
  search: (q: string) => api.get('/api/drugs', { params: { search: q, limit: 25 } }),
};

export const otAPI = {
  postStage: (surgeryId: string, stage: string, note?: string) =>
    api.post(`/api/surgeries/${surgeryId}/stage`, { stage, note }),
  stages: () => api.get('/api/surgery-stages'),
  history: (surgeryId: string) => api.get(`/api/surgeries/${surgeryId}/stages`),
  familyContacts: (surgeryId: string) => api.get(`/api/surgeries/${surgeryId}/family-contacts`),
  addFamilyContact: (surgeryId: string, contact: { name: string; phone: string; relation: string }) =>
    api.post(`/api/surgeries/${surgeryId}/family-contacts`, contact),
};
