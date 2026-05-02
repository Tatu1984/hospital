import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// VITE_API_URL is required in prod and validated at build time below.
// In dev we fall back to '' so the Vite proxy (vite.config.ts) handles
// /api/* — that's the path of least friction for `npm run dev`.
const API_URL = import.meta.env.VITE_API_URL || '';
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  // Production builds without VITE_API_URL would silently call same-origin,
  // which is wrong because the SPA and API are on different Vercel domains.
  // Surface the misconfiguration loudly instead of letting the user hit a
  // confusing CORS error on every request.
  // eslint-disable-next-line no-console
  console.error(
    '[api] VITE_API_URL is not set in this production build. ' +
    'Set it in the Vercel project env (e.g. https://hospital-api-xxx.vercel.app) and redeploy.'
  );
}

// Token storage. Access token lives in sessionStorage (cleared on tab close);
// refresh token now lives in an httpOnly cookie set by the backend so JS
// (and therefore an XSS payload) can't read it. Old localStorage values are
// cleaned up on `clear()` to migrate existing sessions cleanly.
export const tokenStore = {
  getAccess: () => sessionStorage.getItem('token') || localStorage.getItem('token'),
  set: (access: string) => {
    sessionStorage.setItem('token', access);
    localStorage.setItem('token', access); // legacy readers still find it
  },
  clear: () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    // Clean up legacy refresh-token storage if a previous build wrote it.
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
  },
};

// withCredentials lets the browser ship the httpOnly refresh cookie on
// /api/auth/refresh and /api/auth/logout (cross-site, so it's required).
const api = axios.create({ baseURL: API_URL, withCredentials: true });

// Attach access token to every outgoing request, plus a per-request id so
// the backend can echo it back into Sentry / Winston / audit logs and we can
// correlate a UI report with server logs.
function newRequestId(): string {
  // crypto.randomUUID is widely supported but missing on iOS < 14 / older
  // Edge — fall back to a Math.random-based id if it's not available.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (!config.headers['X-Request-ID']) {
    config.headers['X-Request-ID'] = newRequestId();
  }
  return config;
});

// --- Single-flight refresh on 401 -----------------------------------------
// If many requests fire concurrently and all 401 at once, we want exactly ONE
// /auth/refresh call and to retry the rest with the fresh token. The refresh
// token rides on the httpOnly cookie — no body needed — so withCredentials is
// the only thing that matters here.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true })
    .then((res) => {
      const { token } = res.data || {};
      if (!token) return null;
      tokenStore.set(token);
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
  refresh: () => api.post('/api/auth/refresh', {}),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
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
