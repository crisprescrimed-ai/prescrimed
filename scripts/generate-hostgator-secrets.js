import crypto from 'crypto';

function generateSecret(bytes = 64) {
  return crypto.randomBytes(bytes).toString('hex');
}

const jwtSecret = generateSecret(64);
const refreshSecret = generateSecret(64);

console.log('JWT_SECRET=' + jwtSecret);
console.log('JWT_REFRESH_SECRET=' + refreshSecret);
console.log('SESSION_TIMEOUT=8h');