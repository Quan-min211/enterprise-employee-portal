import axiosClient from './axiosClient';

export const dashboardApi = {
  getSummary: () => axiosClient.get('/dashboard/summary'),
  getMonthlyRequests: (params = {}) => axiosClient.get('/dashboard/monthly-requests', { params })
};
