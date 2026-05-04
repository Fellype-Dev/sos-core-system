import api from './api';

const authService = {
  login: async ({ email, password, selected_program_id } = {}) => {
    const response = await api.post('/auth/login', {
      email,
      password,
      ...(selected_program_id ? { selected_program_id } : {}),
    });
    return response.data;
  },

  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  switchProgram: async (program_id) => {
    const response = await api.post('/auth/switch-program', { program_id });
    return response.data;
  },
};

export default authService;
