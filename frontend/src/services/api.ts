import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

// Token storage helpers — kept in one place so AuthContext and the interceptor
// agree on key names. Access tokens live in sessionStorage (cleared on tab close);
// refresh tokens live in localStorage (so a refresh survives a reload).
export const tokenStore = {
  getAccess: () => sessionStorage.getItem('token') || localStorage.getItem('token'),
  getRefresh: () => localStorage.getItem('refreshToken'),
  set: (access: string, refresh?: string) => {
    sessionStorage.setItem('token', access);
    localStorage.setItem('token', access); // back-compat for any code reading localStorage
    if (refresh) localStorage.setItem('refreshToken', refresh);
  },
  clear: () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
  },
};

const api = axios.create({ baseURL: API_URL });

// Attach access token to every outgoing request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Single-flight refresh on 401 -----------------------------------------
// If many requests fire concurrently and all 401 at once, we want exactly ONE
// /auth/refresh call and to retry the rest with the fresh token.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return null;

  refreshPromise = axios
    .post(`${API_URL}/api/auth/refresh`, { refreshToken })
    .then((res) => {
      const { token, refreshToken: newRefresh } = res.data || {};
      if (!token) return null;
      tokenStore.set(token, newRefresh);
      return token;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    // Don't try to refresh on the refresh endpoint itself, on login, or if already retried.
    const url = String(original?.url || '');
    const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/auth/refresh');

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = { ...(original.headers || {}), Authorization: `Bearer ${newToken}` };
        return api.request(original);
      }
    }

    if (status === 401) {
      tokenStore.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/api/auth/login', { username, password }),
  refresh: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refreshToken }),
  logout: () => api.post('/api/auth/logout'),
};

export const patientAPI = {
  getAll: (params?: any) => api.get('/api/patients', { params }),
  getById: (id: string) => api.get(`/api/patients/${id}`),
  create: (data: any) => api.post('/api/patients', data),
  update: (id: string, data: any) => api.put(`/api/patients/${id}`, data),
};

export const encounterAPI = {
  getAll: (params?: any) => api.get('/api/encounters', { params }),
  create: (data: any) => api.post('/api/encounters', data),
};

export const opdAPI = {
  getNotes: (encounterId: string) => api.get(`/api/opd-notes/${encounterId}`),
  createNote: (data: any) => api.post('/api/opd-notes', data),
};

export const invoiceAPI = {
  getAll: (params?: any) => api.get('/api/invoices', { params }),
  create: (data: any) => api.post('/api/invoices', data),
  addPayment: (id: string, data: any) => api.post(`/api/invoices/${id}/payment`, data),
};

export const dashboardAPI = {
  getStats: () => api.get('/api/dashboard/stats'),
};

export default api;
