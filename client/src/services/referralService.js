import api from './api';

const referralService = {
  getAll: async (params = {}) => {
    const response = await api.get('/referrals', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/referrals/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/referrals', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/referrals/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/referrals/${id}`);
    return response.data;
  },
};

export default referralService;
