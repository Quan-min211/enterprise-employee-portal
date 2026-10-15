import axiosClient from './axiosClient';

export const authApi = {
  me: () => axiosClient.get('/auth/me'),
  login: (email, password) => axiosClient.post('/auth/login', { email, password }),
  logout: () => axiosClient.post('/auth/logout'),
  getCsrfToken: () => axiosClient.get('/auth/csrf-token')
};

