import api from './api';

const programService = {
  getAll: async () => {
    const response = await api.get('/programs');
    return response.data;
  },
};

export default programService;
