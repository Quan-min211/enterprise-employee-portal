import axiosClient from './axiosClient';

export const announcementsApi = {
  list: (params = {}) => axiosClient.get('/announcements', { params }),
  create: (payload) => axiosClient.post('/announcements', payload),
  update: (id, payload) => axiosClient.put(`/announcements/${id}`, payload),
  remove: (id) => axiosClient.delete(`/announcements/${id}`)
};
