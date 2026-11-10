import axiosClient from './axiosClient';

export const dashboardApi = {
  getSummary: () => axiosClient.get('/dashboard/summary'),
  getMonthlyRequests: (params = {}) => axiosClient.get('/dashboard/monthly-requests', { params }),
  getTopOtDepartments: (params = {}) => axiosClient.get('/dashboard/top-ot-departments', { params }),
  getApprovalRate: (params = {}) => axiosClient.get('/dashboard/approval-rate', { params })
};
