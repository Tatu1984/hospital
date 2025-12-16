import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/api/auth/login', { username, password }),
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
