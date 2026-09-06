import axiosClient from './axiosClient';

export const employeesApi = {
  list: (params = {}) => axiosClient.get('/employees', { params }),
  getById: (id) => axiosClient.get(`/employees/${id}`),
  create: (payload) => axiosClient.post('/employees', payload),
  update: (id, payload) => axiosClient.put(`/employees/${id}`, payload),
  deactivate: (id) => axiosClient.delete(`/employees/${id}`),
  updateMe: (payload) => axiosClient.put('/employees/me', payload),
  changePassword: (payload) => axiosClient.put('/employees/me/password', payload)
};
