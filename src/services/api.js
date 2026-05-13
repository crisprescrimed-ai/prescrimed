import axios from 'axios';
import { supabaseClient } from '../lib/supabase';
import { getSelectedEmpresaId } from '../utils/empresaContext';
import { resolveApiRootUrl, resolveApiUrl } from './api.config';

const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const isProduction = import.meta.env.PROD;
const explicitApiUrl = import.meta.env.VITE_API_URL?.trim();
const explicitBackendRoot = import.meta.env.VITE_BACKEND_ROOT?.trim();

// Configuração da API baseada no ambiente
export const getApiUrl = () => {
  const resolvedApiUrl = resolveApiUrl({
    hostname,
    isProduction,
    explicitApiUrl,
  });

  if (isProduction && explicitApiUrl) {
    console.log('🌍 Produção com API explícita configurada:', resolvedApiUrl);
    return resolvedApiUrl;
  }

  if (resolvedApiUrl === '/api' && hostname.includes('railway.app') && isProduction) {
    console.log('🚂 Railway detectado - usando /api (mesmo serviço)');
    return resolvedApiUrl;
  }

  if (resolvedApiUrl === '/api' && isProduction) {
    console.log('🌐 Produção em domínio próprio - usando /api na mesma origem');
    return resolvedApiUrl;
  }

  const devApiUrl = resolvedApiUrl;
  console.log('💻 Desenvolvimento local - usando', devApiUrl);
  return devApiUrl;
};

// Obtém a URL raiz do backend (sem o sufixo /api) para endpoints como /health
export const getApiRootUrl = () => {
  return resolveApiRootUrl({
    hostname,
    isProduction,
    explicitApiUrl,
    explicitBackendRoot,
  });
};

console.log('🌐 API URL configurada:', getApiUrl());
console.log('🏠 API Root URL:', getApiRootUrl());

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token nas requisições
// Usa Supabase access_token (primário) ou token legado do localStorage (fallback)
api.interceptors.request.use(
  async (config) => {
    let token = null;

    // 1. Tenta obter o token da sessão Supabase
    if (supabaseClient) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        token = session?.access_token || null;
      } catch {
        // ignora falha ao obter sessão
      }
    }

    // 2. Fallback: token legado armazenado manualmente
    if (!token) {
      token = localStorage.getItem('token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Contexto opcional de empresa para superadmin
    try {
      const userRaw = localStorage.getItem('prescrimed_user') || localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const selectedEmpresaId = getSelectedEmpresaId();

      if (user?.role === 'superadmin' && selectedEmpresaId) {
        config.headers['X-Empresa-Id'] = selectedEmpresaId;
      }
    } catch {
      // ignora parsing inválido
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Erro de rede - backend não está rodando
    if (!error.response) {
        console.error('🔴 Backend offline:', error.message);
        // Usa a raiz do backend se disponível para dar instruções mais úteis
        const root = getApiRootUrl();
        const hostHint = root ? `${root}` : 'seu backend/configurações de ambiente';
        const errorMessage = `Não foi possível conectar ao servidor. Verifique se o backend está acessível em ${hostHint} e se as variáveis de ambiente do frontend estão configuradas.`;
      
      // Tenta mostrar um toast se disponível
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      } else {
        console.error(errorMessage);
      }
      
      return Promise.reject({ 
        message: errorMessage,
        originalError: error,
        isNetworkError: true 
      });
    }

    // Se o token expirou, tenta renovar via Supabase (auto-refresh) ou redireciona para login
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Não tenta renovar em rotas de autenticação
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/me')) {
        localStorage.removeItem('prescrimed_user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window && window.location && !window.location.hash.includes('#/login')) {
          window.location.hash = '#/login';
        }
        return Promise.reject({ message: 'Sessão expirada. Faça login novamente.' });
      }

      originalRequest._retry = true;

      try {
        // O Supabase renova o token automaticamente (autoRefreshToken: true).
        // Basta obter a sessão atual para ter o token atualizado.
        let newToken = null;
        if (supabaseClient) {
          const { data: { session } } = await supabaseClient.auth.getSession();
          newToken = session?.access_token || null;
        }

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }

        // Se não há sessão válida, redireciona para login
        if (supabaseClient) await supabaseClient.auth.signOut();
        localStorage.removeItem('prescrimed_user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window && window.location && !window.location.hash.includes('#/login')) {
          window.location.hash = '#/login';
        }
        return Promise.reject({ message: 'Sessão expirada. Faça login novamente.' });
      } catch (refreshError) {
        console.error('🔴 Falha ao renovar sessão:', refreshError);
        localStorage.removeItem('prescrimed_user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window && window.location && !window.location.hash.includes('#/login')) {
          window.location.hash = '#/login';
        }
        return Promise.reject({ 
          message: 'Sessão expirada. Faça login novamente.',
          originalError: refreshError 
        });
      }
    }

    // Log detalhado de erros
    if (error.response?.status === 404) {
      console.error('🔴 Rota não encontrada:', originalRequest.url);
    } else if (error.response?.status === 400) {
      console.error('🔴 Requisição inválida:', originalRequest.url, error.response.data);
    }

    // Erros 5xx/503: mantém UI responsiva e comunica de forma elegante
    if (error.response?.status >= 500) {
      const status = error.response.status;
      const serverMessage = error.response?.data?.error;
      const message = status === 503
        ? (serverMessage || 'Serviço temporariamente indisponível. Tente novamente em instantes.')
        : (serverMessage || 'Erro interno no servidor. Tente novamente em instantes.');

      if (window.showToast) {
        window.showToast(message, 'error');
      }
    }

    return Promise.reject(error);
  }
);

export default api;