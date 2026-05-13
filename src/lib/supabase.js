import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'prescrimed.supabase.config';

const buildSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const buildSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

const normalizeConfig = (config = {}) => ({
  url: config.url?.trim() || '',
  anonKey: config.anonKey?.trim() || '',
});

const canUseBrowserStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const getSupabaseRuntimeConfig = () => {
  if (!canUseBrowserStorage()) {
    return normalizeConfig();
  }

  try {
    const rawConfig = window.localStorage.getItem(STORAGE_KEY);

    if (!rawConfig) {
      return normalizeConfig();
    }

    return normalizeConfig(JSON.parse(rawConfig));
  } catch {
    return normalizeConfig();
  }
};

const getResolvedSupabaseConfig = () => {
  const runtimeConfig = getSupabaseRuntimeConfig();

  return normalizeConfig({
    url: runtimeConfig.url || buildSupabaseUrl,
    anonKey: runtimeConfig.anonKey || buildSupabaseAnonKey,
  });
};

export const getSupabaseConfigSource = () => {
  const runtimeConfig = getSupabaseRuntimeConfig();

  if (runtimeConfig.url || runtimeConfig.anonKey) {
    return 'runtime';
  }

  if (buildSupabaseUrl || buildSupabaseAnonKey) {
    return 'build';
  }

  return 'none';
};

export const saveSupabaseRuntimeConfig = (config = {}) => {
  if (!canUseBrowserStorage()) {
    return false;
  }

  const normalizedConfig = normalizeConfig(config);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedConfig));
  return true;
};

export const clearSupabaseRuntimeConfig = () => {
  if (!canUseBrowserStorage()) {
    return false;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  return true;
};

export const getSupabaseUrl = () => getResolvedSupabaseConfig().url;
export const getSupabaseAnonKey = () => getResolvedSupabaseConfig().anonKey;

export const isSupabaseConfigured = () => {
  const config = getResolvedSupabaseConfig();
  return Boolean(config.url && config.anonKey);
};

export const getSupabaseConfigStatus = () => {
  const config = getResolvedSupabaseConfig();

  if (!config.url && !config.anonKey) {
    return 'missing';
  }

  if (!config.url || !config.anonKey) {
    return 'partial';
  }

  return 'ready';
};

export const getSupabaseProjectRef = () => {
  const config = getResolvedSupabaseConfig();

  if (!config.url) return '';

  try {
    return new URL(config.url).hostname.split('.')[0] || '';
  } catch {
    return '';
  }
};

export const createSupabaseClientFromConfig = (config = getResolvedSupabaseConfig()) => {
  const normalizedConfig = normalizeConfig(config);

  if (!normalizedConfig.url || !normalizedConfig.anonKey) {
    return null;
  }

  return createClient(normalizedConfig.url, normalizedConfig.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
};

export const validateSupabaseConnection = async (config = getResolvedSupabaseConfig()) => {
  const normalizedConfig = normalizeConfig(config);

  if (!normalizedConfig.url || !normalizedConfig.anonKey) {
    return {
      ok: false,
      status: null,
      message: 'Informe URL e anon key para validar a conexão.',
    };
  }

  try {
    const response = await fetch(`${normalizedConfig.url}/auth/v1/settings`, {
      headers: {
        apikey: normalizedConfig.anonKey,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: response.status === 401 || response.status === 403
          ? 'A anon key foi rejeitada pelo Supabase.'
          : `O Supabase respondeu com status ${response.status}.`,
      };
    }

    return {
      ok: true,
      status: response.status,
      message: 'Conexão validada com sucesso.',
    };
  } catch {
    return {
      ok: false,
      status: null,
      message: 'Não foi possível alcançar o projeto Supabase a partir deste navegador.',
    };
  }
};

const supabaseClient = createSupabaseClientFromConfig();

if (!supabaseClient && import.meta.env.DEV) {
  console.warn('Supabase client não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
}

export { supabaseClient };