import { create } from 'zustand';
import { get } from '../services/request';
import authService from '../services/auth.service';

// Persiste o perfil do usuário no localStorage para que api.js possa
// ler o role sem depender do store (evita circular dependency).
const persistUser = (user) => {
  if (user) {
    localStorage.setItem('prescrimed_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('prescrimed_user');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
};

const fetchProfile = async () => {
  try {
    return await get('/auth/me');
  } catch {
    return null;
  }
};

const restoreLegacySession = async (set) => {
  const user = await fetchProfile();
  if (user) {
    persistUser(user);
    set({ user, isAuthenticated: true, loading: false });
    return true;
  }

  persistUser(null);
  set({ user: null, isAuthenticated: false, loading: false });
  return false;
};

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  /** true enquanto a sessao persistida esta sendo validada no carregamento inicial */
  loading: true,

  initialize: async () => {
    if (localStorage.getItem('token')) {
      await restoreLegacySession(set);
      return;
    }
    set({ loading: false });
  },

  login: async (email, senha) => {
    await authService.login(email, senha);

    const user = await fetchProfile();
    if (!user) {
      throw Object.assign(new Error('Usuário não encontrado no sistema.'), {
        response: {
          status: 403,
          data: { error: 'Usuário não encontrado no sistema.', code: 'user_not_found' },
        },
      });
    }

    persistUser(user);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await authService.logout();
    persistUser(null);
    set({ user: null, isAuthenticated: false });
  },

  hasPermission: (modulo) => {
    const state = useAuthStore.getState();
    if (!state.user) return false;
    if (state.user.role === 'admin' || state.user.role === 'superadmin') return true;
    return state.user.permissoes?.includes(modulo) || false;
  },
}));