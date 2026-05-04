import api from './api';

const attendanceService = {
  getByDate: async (params = {}) => {
    const response = await api.get('/attendance', { params });
    return response.data;
  },

  getSessions: async (params = {}) => {
    const response = await api.get('/attendance/sessions', { params });
    return response.data;
  },

  getSessionDetail: async (sessionId) => {
    const response = await api.get(`/attendance/sessions/${sessionId}`);
    return response.data;
  },

  save: async (payload) => {
    const response = await api.post('/attendance', payload);
    return response.data;
  },
};

export default attendanceService;
