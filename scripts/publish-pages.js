#!/usr/bin/env node
/**
 * Publica o build do cliente (client/dist) na pasta docs/ para GitHub Pages.
 * Mantém arquivos existentes como swagger.yaml.
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const distDir = path.join(root, 'client', 'dist');
const docsDir = path.join(root, 'docs');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      removeDir(p);
      fs.rmdirSync(p);
    } else {
      fs.unlinkSync(p);
    }
  }
}

try {
  if (!fs.existsSync(distDir)) {
    console.error('❌ Build não encontrado em client/dist. Execute: npm run build:pages');
    process.exit(1);
  }

  ensureDir(docsDir);

  // Preservar arquivos específicos (ex.: swagger.yaml)
  const preserve = new Set(['swagger.yaml']);
  const tempKeep = [];
  for (const file of preserve) {
    const p = path.join(docsDir, file);
    if (fs.existsSync(p)) {
      const tmp = path.join(docsDir, `${file}.keep`);
      try { fs.copyFileSync(p, tmp); } catch {}
      tempKeep.push({ src: tmp, dest: p });
    }
  }

  // Limpar docs (sem remover a pasta)
  for (const entry of fs.readdirSync(docsDir)) {
    const p = path.join(docsDir, entry);
    if (preserve.has(entry)) continue; // será restaurado
    const stat = fs.statSync(p);
    if (stat.isDirectory()) removeDir(p), fs.rmdirSync(p);
    else fs.unlinkSync(p);
  }

  // Copiar dist para docs
  copyDir(distDir, docsDir);

  // Restaurar preservados
  for (const { src, dest } of tempKeep) {
    try { if (fs.existsSync(src)) fs.copyFileSync(src, dest); } catch {}
    try { if (fs.existsSync(src)) fs.unlinkSync(src); } catch {}
  }

  console.log('✅ Publicação concluída: client/dist → docs/');
  process.exit(0);
} catch (err) {
  console.error('❌ Falha ao publicar páginas:', err.message);
  process.exit(1);
}
