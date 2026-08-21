import axios from 'axios';

// Points at the deployed Django backend by default; override for local work with
// VITE_API_BASE_URL=http://127.0.0.1:8000 in frontend/.env.local
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://my-portfolio-backend-awei.onrender.com';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

export const TOKEN_KEY = 'crm_access_token';
export const REFRESH_KEY = 'crm_refresh_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = ({ access, refresh }) => {
  if (access) localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// One refresh attempt per failed request; if that fails too, drop the session
// and let the route guard bounce the user to the login screen.
let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes('/crm/auth/');

    if (error.response?.status === 401 && !original._retried && !isAuthCall) {
      original._retried = true;
      const refresh = getRefreshToken();
      if (!refresh) {
        clearTokens();
        return Promise.reject(error);
      }
      try {
        refreshing =
          refreshing ||
          axios.post(`${API_BASE_URL}/api/crm/auth/refresh/`, { refresh });
        const { data } = await refreshing;
        refreshing = null;
        setTokens(data);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (refreshError) {
        refreshing = null;
        clearTokens();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
