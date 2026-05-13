import { supabaseClient } from '../lib/supabase';
import { post } from './request';
import { loginWithSupabaseFallback } from './auth.helpers';

const loginWithBackend = async (email, senha) => {
  const data = await post('/auth/login', { email, senha });

  if (data?.token) {
    localStorage.setItem('token', data.token);
  }

  return data;
};

const authService = {
  /**
   * Login via Supabase Auth.
   * O authStore chama esta função e lida com o estado resultante.
   * Não armazena token manualmente — o Supabase SDK gerencia a sessão.
   */
  login: async (email, senha) => {
    if (!supabaseClient) {
      return loginWithBackend(email, senha);
    }

    const result = await loginWithSupabaseFallback({
      signInWithPassword: (credentials) => supabaseClient.auth.signInWithPassword(credentials),
      loginWithBackend,
      email,
      senha,
    });

    if (result?.provider === 'supabase') {
      localStorage.removeItem('token');
      return result;
    }

    return result;
  },

  /**
   * Logout: encerra a sessão no Supabase e limpa dados locais.
   */
  logout: async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
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

  /**
   * Registro: cria a empresa + usuário no banco via backend e cria a conta
   * no Supabase Auth para permitir login via supabase.auth.signInWithPassword.
   */
  register: async (data) => {
    // 1. Cria Empresa + Usuario no banco da aplicação
    await post('/auth/register', data);

    // 2. Cria conta no Supabase Auth (permite login futuro sem JWT customizado)
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signUp({
        email: data.email,
        password: data.senha,
        options: {
          data: { nome: data.nomeAdmin || data.nomeUsuario },
        },
      });
      if (error && error.message !== 'User already registered') {
        console.warn('[Supabase Auth] signUp:', error.message);
      }
    }
  },
};

export default authService;