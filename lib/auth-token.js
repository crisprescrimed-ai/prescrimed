import crypto from 'node:crypto';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const sign = (value, secret) => crypto
  .createHmac('sha256', secret)
  .update(value)
  .digest('base64url');

export const createAuthToken = ({ userId, secret, expiresInSeconds = 28800 }) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = encode({ sub: userId, iat: issuedAt, exp: issuedAt + expiresInSeconds });
  return `${payload}.${sign(payload, secret)}`;
};

export const readAuthToken = ({ token, secret }) => {
  if (!token || !secret) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length
    || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.sub || !Number.isFinite(data.exp) || data.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
};