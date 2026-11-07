import axiosClient from './axiosClient';

export const reportsApi = {
  getMonthlySummary: (params = {}) => axiosClient.get('/reports/monthly-summary', { params }),
  exportMonthlySummary: (params = {}) =>
    axiosClient.get('/reports/monthly-summary/export', { params, responseType: 'blob' })
};

