import axiosClient from './axiosClient';

export const announcementsApi = {
  list: (params = {}) => axiosClient.get('/announcements', { params }),
  create: (payload) => axiosClient.post('/announcements', payload)
};
