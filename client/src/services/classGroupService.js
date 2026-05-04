import api from './api';

const classGroupService = {
  list: async (program_id) => {
    const response = await api.get('/class-groups', { params: { program_id } });
    return response.data;
  },

  create: async (payload) => {
    const response = await api.post('/class-groups', payload);
    return response.data;
  },

  update: async (id, payload) => {
    const response = await api.put(`/class-groups/${id}`, payload);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/class-groups/${id}`);
    return response.data;
  },
};

export default classGroupService;
