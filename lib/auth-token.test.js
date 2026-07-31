import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthToken, readAuthToken } from './auth-token.js';

test('cria e le token de sessao valido', () => {
  const token = createAuthToken({ userId: 'user-123', secret: 'test-secret' });
  const payload = readAuthToken({ token, secret: 'test-secret' });

  assert.equal(payload.sub, 'user-123');
});

test('rejeita token com assinatura invalida ou expirado', () => {
  const token = createAuthToken({ userId: 'user-123', secret: 'test-secret' });
  const expired = createAuthToken({ userId: 'user-123', secret: 'test-secret', expiresInSeconds: -1 });

  assert.equal(readAuthToken({ token, secret: 'other-secret' }), null);
  assert.equal(readAuthToken({ token: expired, secret: 'test-secret' }), null);
});