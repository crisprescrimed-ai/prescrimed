import { create } from 'zustand';
import { supabaseClient } from '../lib/supabase';
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
  /** true enquanto a sessão do Supabase está sendo verificada no carregamento inicial */
  loading: true,

  /**
   * Deve ser chamado UMA vez na inicialização da aplicação (main.jsx).
   * Restaura a sessão existente do Supabase e registra o listener de mudanças.
   */
  initialize: async () => {
    if (!supabaseClient) {
      await restoreLegacySession(set);
      return;
    }

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        const user = await fetchProfile();
        if (user) {
          persistUser(user);
          set({ user, isAuthenticated: true, loading: false });
        } else {
          await supabaseClient.auth.signOut();
          set({ loading: false });
        }
      } else {
        const legacyToken = localStorage.getItem('token');
        if (legacyToken) {
          await restoreLegacySession(set);
        } else {
          set({ loading: false });
        }
      }
    } catch {
      const legacyToken = localStorage.getItem('token');
      if (legacyToken) {
        await restoreLegacySession(set);
      } else {
        set({ loading: false });
      }
    }

    // Listener de mudanças de sessão (token refresh, logout em outra aba, etc.)
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const user = await fetchProfile();
        if (user) {
          persistUser(user);
          set({ user, isAuthenticated: true, loading: false });
        }
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token renovado automaticamente — apenas atualiza loading se necessário
        set({ loading: false });
      } else if (event === 'SIGNED_OUT') {
        persistUser(null);
        set({ user: null, isAuthenticated: false, loading: false });
      }
    });
  },

  login: async (email, senha) => {
    // Tenta Supabase Auth primeiro e recua para o JWT legado do backend quando necessário.
    await authService.login(email, senha);

    // Busca o perfil completo do backend (com empresaId, role, permissoes)
    const user = await fetchProfile();
    if (!user) {
      // Sessão criada no Supabase mas usuário não existe na aplicação
      await supabaseClient?.auth.signOut();
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