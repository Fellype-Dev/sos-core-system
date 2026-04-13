import api from './api';

const attendanceService = {
  getByDate: async (params = {}) => {
    const response = await api.get('/attendance', { params });
    return response.data;
  },

  save: async (payload) => {
    const response = await api.post('/attendance', payload);
    return response.data;
  },
};

export default attendanceService;
