import test from 'node:test';
import assert from 'node:assert/strict';
import { isNetworkLikeSupabaseError, loginWithSupabaseFallback } from './auth.helpers.js';

test('isNetworkLikeSupabaseError reconhece falha de fetch do Supabase', () => {
  assert.equal(isNetworkLikeSupabaseError(new Error('TypeError: Failed to fetch')), true);
  assert.equal(isNetworkLikeSupabaseError(new Error('Network Error while calling auth')), true);
  assert.equal(isNetworkLikeSupabaseError(new Error('Invalid login credentials')), false);
});

test('loginWithSupabaseFallback recua para o backend quando o Supabase falha por rede', async () => {
  const backendCalls = [];
  const result = await loginWithSupabaseFallback({
    signInWithPassword: async () => {
      throw new Error('Failed to fetch');
    },
    loginWithBackend: async (email, senha) => {
      backendCalls.push({ email, senha });
      return { provider: 'backend', token: 'jwt-token' };
    },
    email: 'admin@prescrimed.com',
    senha: 'admin123',
  });

  assert.deepEqual(backendCalls, [{ email: 'admin@prescrimed.com', senha: 'admin123' }]);
  assert.deepEqual(result, { provider: 'backend', token: 'jwt-token' });
});

test('loginWithSupabaseFallback preserva erro 401 do Supabase quando backend também retorna 401', async () => {
  await assert.rejects(
    () => loginWithSupabaseFallback({
      signInWithPassword: async () => ({
        error: { message: 'Invalid login credentials', status: 400 },
      }),
      loginWithBackend: async () => {
        const error = new Error('Credenciais inválidas');
        error.response = { status: 401 };
        throw error;
      },
      email: 'admin@prescrimed.com',
      senha: 'errada',
    }),
    (error) => error?.response?.status === 401 && error?.message === 'Invalid login credentials'
  );
});