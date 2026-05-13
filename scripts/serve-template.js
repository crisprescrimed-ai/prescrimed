import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const templateDir = path.join(rootDir, 'Template');

if (!fs.existsSync(templateDir)) {
  console.error('❌ Pasta Template/ não encontrada. Gere primeiro com: npm run build:template');
  process.exit(1);
}

const portRaw = (process.env.PORT || process.env.TEMPLATE_PORT || '4173').toString().trim();
const port = Number.parseInt(portRaw, 10);
const host = process.env.HOST || '0.0.0.0';

if (!Number.isFinite(port) || Number.isNaN(port) || port <= 0 || port > 65535) {
  console.error(`❌ Porta inválida: ${portRaw}`);
  process.exit(1);
}

const app = express();

// Importante: abrir index.html via file:// causa bloqueio de assets (CORS).
// Este servidor existe apenas para preview local do build HostGator.
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(express.static(templateDir, { extensions: ['html'] }));

// SPA fallback: qualquer rota desconhecida cai no index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(templateDir, 'index.html'));
});

app.listen(port, host, () => {
  console.log('✅ Preview local do Template iniciado');
  console.log(`- Pasta: ${templateDir}`);
  console.log(`- URL:   http://localhost:${port}/`);
  console.log('');
  console.log('Dica: não use file:// para testar este build no Chrome.');
});
