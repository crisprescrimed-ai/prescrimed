#!/usr/bin/env node
// Deploy to Hostgator via FTP using basic-ftp
// Usage:
// 1) npm install basic-ftp --no-save
// 2) set env vars HOSTGATOR_HOST, HOSTGATOR_USER, HOSTGATOR_PASS, HOSTGATOR_PATH
// 3) node scripts/deploy_hostgator.mjs

import ftp from 'basic-ftp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localDir = path.resolve(__dirname, '..', 'Template');
const host = process.env.HOSTGATOR_HOST || process.env.FTP_HOST;
const user = process.env.HOSTGATOR_USER || process.env.FTP_USER;
const password = process.env.HOSTGATOR_PASS || process.env.FTP_PASS;
const remotePath = process.env.HOSTGATOR_PATH || process.env.FTP_PATH || '/public_html';
const secure = (process.env.HOSTGATOR_SECURE || 'false').toLowerCase() === 'true';

if (!host || !user || !password) {
  console.error('Missing FTP credentials. Set HOSTGATOR_HOST, HOSTGATOR_USER and HOSTGATOR_PASS.');
  process.exit(1);
}

async function run() {
  const client = new ftp.Client(0);
  client.ftp.verbose = !!process.env.DEBUG_FTP;
  try {
    console.log(`Connecting to ${host} (secure=${secure})...`);
    await client.access({ host, user, password, secure });
    console.log('Connected. Ensuring remote directory:', remotePath);
    await client.ensureDir(remotePath);
    await client.cd(remotePath);

    console.log('Uploading Template =>', remotePath);
    // uploadFromDir will recursively upload localDir contents into current remoteDir
    await client.uploadFromDir(localDir);

    console.log('Upload complete. You may verify with: curl -I https://<your-domain>/assets/index-*.js');
  } catch (err) {
    console.error('Deploy failed:', err.message || err);
    process.exitCode = 2;
  } finally {
    client.close();
  }
}

run();
