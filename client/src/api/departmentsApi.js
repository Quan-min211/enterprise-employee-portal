import axiosClient from './axiosClient';

export const departmentsApi = {
  list: () => axiosClient.get('/departments'),
  create: (payload) => axiosClient.post('/departments', payload),
  update: (id, payload) => axiosClient.put(`/departments/${id}`, payload),
  remove: (id) => axiosClient.delete(`/departments/${id}`)
};
