import axiosClient from './axiosClient';

export const leavesApi = {
  list: (params = {}) => axiosClient.get('/leaves', { params }),
  create: (payload) => axiosClient.post('/leaves', payload),
  stats: (params = {}) => axiosClient.get('/leaves/stats', { params }),
  updateStatus: (id, payload) => axiosClient.patch(`/leaves/${id}/status`, payload),
  cancel: (id) => axiosClient.patch(`/leaves/${id}/cancel`),
  exportCsv: (params = {}) => axiosClient.get('/leaves/export', { params, responseType: 'blob' })
};

export const leaveBalancesApi = {
  getMyBalance: (params = {}) => axiosClient.get('/leave-balances/me', { params }),
  list: (params = {}) => axiosClient.get('/leave-balances', { params }),
  update: (userId, year, payload) => axiosClient.put(`/leave-balances/${userId}/${year}`, payload)
};

export const holidaysApi = {
  list: (params = {}) => axiosClient.get('/holidays', { params }),
  create: (payload) => axiosClient.post('/holidays', payload),
  update: (id, payload) => axiosClient.put(`/holidays/${id}`, payload),
  remove: (id) => axiosClient.delete(`/holidays/${id}`),
  seedDefaults: () => axiosClient.post('/holidays/seed-defaults')
};
