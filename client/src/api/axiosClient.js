import axios from 'axios';

let memoryCsrfToken = null;

export const setCsrfToken = (token) => {
  memoryCsrfToken = token;
};

export const getCsrfToken = () => memoryCsrfToken;

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    'Content-Type': 'application/json'
  }
});

axiosClient.interceptors.request.use(
  (config) => {
    if (memoryCsrfToken) {
      config.headers = config.headers || {};
      config.headers['X-CSRF-Token'] = memoryCsrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => {
    if (response.data?.csrfToken) {
      setCsrfToken(response.data.csrfToken);
    }
    return response.data;
  },
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/me') ||
      requestUrl.includes('/auth/csrf-token');

    if ((error.response?.status === 401 || error.response?.status === 403) && !isAuthEndpoint) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.sessionStorage.setItem('session-expired', '1');
        window.location.assign('/login');
      }
    }
    const message = error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
    return Promise.reject(new Error(message));
  }
);

export default axiosClient;

