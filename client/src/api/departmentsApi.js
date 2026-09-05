import axiosClient from './axiosClient';

export const departmentsApi = {
  list: () => axiosClient.get('/departments')
};
