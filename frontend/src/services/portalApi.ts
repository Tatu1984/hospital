// Axios instance for the patient-facing portal. Lives outside the staff
// AuthContext entirely — the token is OTP-issued, stored in
// localStorage.patientPortalSession, and never participates in the
// access-token refresh flow used by the staff portal.
//
// 401 responses bounce the user back to /me/login.

import axios, { AxiosError } from 'axios';

export interface PatientPortalSession {
  token: string;
  patient: {
    id: string;
    name: string;
    mrn?: string | null;
    dob?: string | null;
  };
}

const STORAGE_KEY = 'patientPortalSession';

export function getSession(): PatientPortalSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PatientPortalSession;
  } catch {
    return null;
  }
}

export function setSession(s: PatientPortalSession): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function clearSession(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

const API_URL = (import.meta as any).env?.VITE_API_URL || '';

const portalApi = axios.create({ baseURL: API_URL });

portalApi.interceptors.request.use((config) => {
  const s = getSession();
  if (s?.token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${s.token}`;
  }
  return config;
});

portalApi.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearSession();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/me/login')) {
        window.location.href = '/me/login';
      }
    }
    return Promise.reject(error);
  },
);

export default portalApi;
