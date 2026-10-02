import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/me');

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
