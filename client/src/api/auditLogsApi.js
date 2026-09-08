import axiosClient from './axiosClient';

export const auditLogsApi = {
  list: (params = {}) => axiosClient.get('/audit-logs', { params })
};
