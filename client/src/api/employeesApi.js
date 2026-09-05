import axiosClient from './axiosClient';

export const employeesApi = {
  list: (params = {}) => axiosClient.get('/employees', { params }),
  getById: (id) => axiosClient.get(`/employees/${id}`),
  updateMe: (payload) => axiosClient.put('/employees/me', payload),
  changePassword: (payload) => axiosClient.put('/employees/me/password', payload)
};
