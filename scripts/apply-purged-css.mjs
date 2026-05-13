import fs from 'fs';
import path from 'path';

const root = process.cwd();
const src = path.resolve(root, 'client', 'dist');
if (!fs.existsSync(src)) {
  console.error('client/dist not found');
  process.exit(2);
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const dest = path.resolve(root, 'archive', `client-dist-before-purged-${ts}`);
console.log('Backing up', src, '->', dest);
try {
  fs.cpSync(src, dest, { recursive: true, force: true });
} catch (e) {
  console.error('Backup failed:', e.message);
  process.exit(2);
}

const assetsDir = path.join(src, 'assets');
const cssFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.css') && f.startsWith('index-'));
if (!cssFiles.length) {
  console.error('No index-*.css found in client/dist/assets');
  process.exit(2);
}
const origCss = path.join(assetsDir, cssFiles[0]);
const purgedCss = path.join(assetsDir, 'purged', 'index-purged.css');
if (!fs.existsSync(purgedCss)) {
  console.error('Purged css not found:', purgedCss);
  process.exit(2);
}

console.log('Replacing', origCss, 'with', purgedCss);
try {
  fs.copyFileSync(purgedCss, origCss);
} catch (e) {
  console.error('Replace failed:', e.message);
  process.exit(2);
}

console.log('Backup and replacement completed');
process.exit(0);
