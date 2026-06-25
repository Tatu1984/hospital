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

// Access token lives in a module-local variable only — never in
// localStorage or sessionStorage. An XSS payload cannot read it from
// `document` storage; the worst it could do is call our authenticated APIs
// for the lifetime of the running page (mitigated by access-token TTL and
// CSP). The refresh token sits in an httpOnly cookie that JS can't read,
// so on hard reload we mint a new access via /api/auth/refresh.
let accessTokenInMemory: string | null = null;

export const tokenStore = {
  getAccess: () => accessTokenInMemory,
  set: (access: string) => {
    accessTokenInMemory = access;
  },
  clear: () => {
    accessTokenInMemory = null;
    // Best-effort cleanup of any prior build's storage so an upgraded user
    // doesn't keep a stale token sitting in localStorage forever. Safe to
    // remove after one release window.
    try {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
    } catch {
      /* ignore — storage may be unavailable in some sandboxed contexts */
    }
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
  // Cache-buster on every request. Two reasons:
  //  1. A previously-failed CORS preflight gets cached by the browser for
  //     several minutes by default and can survive "Clear site data" in some
  //     Chrome profiles. A unique query string forces a fresh preflight per
  //     request URL, so a stale negative cache from a misconfigured CORS_ORIGIN
  //     can never lock the user out for more than one click.
  //  2. Defeats overly-aggressive intermediate caching (corporate proxies,
  //     antivirus inspection) that occasionally caches API JSON responses by
  //     URL.
  config.params = { ...(config.params || {}), _t: Date.now() };
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

// Coarse client hints used for device fingerprinting + timezone-mismatch
// detection on the backend. None of this is sensitive; it just sharpens the
// login-security signals. The precise GPS fix is gathered separately (and only
// with explicit consent) by LocationConsentGate.
function collectClientContext() {
  try {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : undefined,
      language: typeof navigator !== 'undefined' ? navigator.language : undefined,
      platform: typeof navigator !== 'undefined' ? (navigator as any).platform : undefined,
    };
  } catch {
    return {};
  }
}

export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/api/auth/login', { username, password, clientContext: collectClientContext() }),
  refresh: () => api.post('/api/auth/refresh', {}),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/auth/change-password', { currentPassword, newPassword }),
};

// Login-security / IP-tracking endpoints.
export const securityAPI = {
  getConsent: () => api.get('/api/auth/location-consent'),
  setConsent: (body: { status: 'GRANTED' | 'DENIED'; latitude?: number; longitude?: number; accuracy?: number }) =>
    api.post('/api/auth/location-consent', body),
  loginSecurity: (limit = 300) => api.get('/api/admin/login-security', { params: { limit } }),
  approveEvent: (id: string, label?: string) => api.post(`/api/admin/auth-events/${id}/approve`, { label }),
};

export const userAPI = {
  update: (id: string, data: any) => api.put(`/api/users/${id}`, data),
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
