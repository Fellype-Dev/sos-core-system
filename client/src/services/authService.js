import api from './api';

const authService = {
  login: async ({ email, password, selected_program_id }) => {
    const response = await api.post('/auth/login', { email, password, selected_program_id });
    return response.data;
  },

  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export default authService;
