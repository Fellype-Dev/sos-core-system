import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const selectedProgramId = localStorage.getItem('selected_program_id');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (selectedProgramId) {
      config.headers['x-program-id'] = selectedProgramId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpa todo o estado de autenticação, não só o token, para não deixar
      // dados sensíveis (usuário, unidades) órfãos no localStorage.
      localStorage.removeItem('token');
      localStorage.removeItem('sos_user');
      localStorage.removeItem('selected_program_id');
      localStorage.removeItem('available_programs');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
