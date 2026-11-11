import { api, downloadFile } from './api.js';

const data = (p) => p.then((r) => r.data);

export const authApi = {
  register: (body) => data(api.post('/auth/register', body)),
  login: (body) => data(api.post('/auth/login', body)),
  logout: () => data(api.post('/auth/logout')),
  me: () => data(api.get('/auth/me')),
  forgot: (email) => data(api.post('/auth/forgot-password', { email })),
  reset: (body) => data(api.post('/auth/reset-password', body)),
  publicSettings: () => data(api.get('/settings/public')),
};

export const tradesApi = {
  list: (params) => data(api.get('/trades', { params })),
  meta: () => data(api.get('/trades/meta')),
  get: (id) => data(api.get(`/trades/${id}`)),
  create: (body) => data(api.post('/trades', body)),
  update: (id, body) => data(api.put(`/trades/${id}`, body)),
  remove: (id) => data(api.delete(`/trades/${id}`)),
  upload: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return data(api.post(`/trades/${id}/attachments`, form));
  },
  removeAttachment: (id, attId) => data(api.delete(`/trades/${id}/attachments/${attId}`)),
  attachmentBlob: (id, attId) => api.get(`/trades/${id}/attachments/${attId}`, { responseType: 'blob' }).then((r) => r.data),
};

export const analyticsApi = {
  overview: (params) => data(api.get('/analytics/overview', { params })),
  monthly: (params) => data(api.get('/analytics/monthly', { params })),
  pairs: (params) => data(api.get('/analytics/pairs', { params })),
  sessions: (params) => data(api.get('/analytics/sessions', { params })),
  psychology: (params) => data(api.get('/analytics/psychology', { params })),
};

export const usersApi = {
  profile: () => data(api.get('/users/profile')),
  updateProfile: (body) => data(api.put('/users/profile', body)),
  updateSettings: (body) => data(api.put('/users/settings', body)),
  changePassword: (body) => data(api.put('/users/password', body)),
};

export const dataApi = {
  csv: (params) => downloadFile('/data/trades.csv', params, 'forex-journal-trades.csv'),
  history: () => downloadFile('/data/history.json', undefined, 'forex-journal-history.json'),
};

export const adminApi = {
  dashboard: () => data(api.get('/admin/dashboard')),
  users: (params) => data(api.get('/admin/users', { params })),
  user: (id) => data(api.get(`/admin/users/${id}`)),
  updateUser: (id, body) => data(api.put(`/admin/users/${id}`, body)),
  resetLink: (id) => data(api.post(`/admin/users/${id}/reset-link`)),
  logs: (params) => data(api.get('/admin/activity-logs', { params })),
  system: () => data(api.get('/admin/system')),
  settings: () => data(api.get('/admin/settings')),
  updateSettings: (body) => data(api.put('/admin/settings', body)),
};
