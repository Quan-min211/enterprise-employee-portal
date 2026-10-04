import axiosClient from './axiosClient';

export const leavesApi = {
  list: (params = {}) => axiosClient.get('/leaves', { params }),
  create: (payload) => axiosClient.post('/leaves', payload),
  stats: (params = {}) => axiosClient.get('/leaves/stats', { params }),
  updateStatus: (id, payload) => axiosClient.patch(`/leaves/${id}/status`, payload),
  exportCsv: (params = {}) => axiosClient.get('/leaves/export', { params, responseType: 'blob' })
};
