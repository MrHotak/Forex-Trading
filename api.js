import axios from 'axios';

const TOKEN_KEY = 'ftj_token';

// The login token is the only thing kept in the browser (localStorage when "Remember me" is ticked,
// otherwise sessionStorage). All trading data lives in the PostgreSQL database.
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token, remember) {
    this.clear();
    try {
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch {
      /* storage blocked: the session lasts until the page reloads */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 45000, // Render's free tier can take a while to wake up
});

api.interceptors.request.use((cfg) => {
  const token = tokenStore.get();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const code = err.response?.data?.error?.code;
    if (err.response?.status === 401 && (code === 'INVALID_TOKEN' || code === 'UNAUTHORIZED')) {
      window.dispatchEvent(new Event('ftj:unauthorized'));
    }
    return Promise.reject(err);
  },
);

/** Normalises any axios error into { code, message, fields, network } for the UI. */
export function parseError(err) {
  if (!err.response) {
    return { code: err.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR', message: err.message, fields: {}, network: true };
  }
  const e = err.response.data?.error || {};
  const fields = {};
  for (const d of e.details || []) if (d.field && !fields[d.field]) fields[d.field] = d.message;
  return { code: e.code || 'INTERNAL_ERROR', message: e.message || 'Something went wrong', fields, status: err.response.status };
}

/** Download an authenticated file (CSV / JSON) through the API and save it. */
export async function downloadFile(url, params, fallbackName) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const disposition = res.headers['content-disposition'] || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = match ? match[1] : fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}
