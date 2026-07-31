import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiRootUrl, resolveApiUrl, shouldMonitorBackend } from './api.config.js';

test('resolveApiUrl usa o proxy local quando não há URL explícita', () => {
  assert.equal(resolveApiUrl(), '/api');
});

test('resolveApiRootUrl usa mesma origem quando a API é relativa', () => {
  const root = resolveApiRootUrl({
    hostname: 'localhost',
    isProduction: true,
    explicitApiUrl: '/api',
    explicitBackendRoot: 'https://prescrimed.up.railway.app',
  });

  assert.equal(root, '');
});

test('resolveApiRootUrl usa backend root explícito em produção quando a API não é relativa', () => {
  const root = resolveApiRootUrl({
    hostname: 'prescrimed.com.br',
    isProduction: true,
    explicitApiUrl: 'https://backend.prescrimed.com.br/api',
    explicitBackendRoot: 'https://backend.prescrimed.com.br',
  });

  assert.equal(root, 'https://backend.prescrimed.com.br');
});

test('shouldMonitorBackend desabilita health check em hospedagem estática sem backend configurado', () => {
  assert.equal(shouldMonitorBackend({
    isDevelopment: false,
    explicitApiUrl: '/api',
  }), false);
});

test('shouldMonitorBackend mantém health check local e em backend explicitamente configurado', () => {
  assert.equal(shouldMonitorBackend({ isDevelopment: true }), true);
  assert.equal(shouldMonitorBackend({
    explicitBackendRoot: 'https://api.prescrimed.com.br',
  }), true);
  assert.equal(shouldMonitorBackend({
    explicitApiUrl: '/api',
    healthCheckEnabled: true,
  }), true);
});
