import axiosClient from './axiosClient';

export const auditLogsApi = {
  list: (params = {}) => axiosClient.get('/audit-logs', { params }),
  exportCsv: (params = {}) => axiosClient.get('/audit-logs/export', { params, responseType: 'blob' })
};
