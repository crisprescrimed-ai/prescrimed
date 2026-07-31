import { post } from './request';

const loginWithBackend = async (email, senha) => {
  const data = await post('/auth/login', { email, senha });

  if (data?.token) {
    localStorage.setItem('token', data.token);
  }

  return data;
};

const authService = {
  login: loginWithBackend,

  logout: async () => {
    localStorage.removeItem('prescrimed_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Retorna o usuário salvo localmente (compatível com sessões antigas).
   */
  getCurrentUser: () => {
    try {
      const raw = localStorage.getItem('prescrimed_user') || localStorage.getItem('user');
      if (!raw || raw === 'undefined') return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  register: async (data) => post('/auth/register', data),
};

export default authService;