import fs from 'fs';
import path from 'path';

const root = process.cwd();
const clientDistAssets = path.resolve(root, 'client', 'dist', 'assets');
if (!fs.existsSync(clientDistAssets)) {
  console.error('client/dist/assets not found. Build the client first.');
  process.exit(2);
}

const cssFiles = fs.readdirSync(clientDistAssets).filter(f => f.endsWith('.css') && f.startsWith('index-'));
if (!cssFiles.length) {
  console.error('No index-*.css file found in client/dist/assets');
  process.exit(2);
}
const cssPath = path.join(clientDistAssets, cssFiles[0]);

let PurgeCSS;
try {
  const mod = await import('purgecss');
  PurgeCSS = mod.PurgeCSS || mod.default?.PurgeCSS || mod.default || mod;
} catch (e) {
  console.error('Failed to import purgecss:', e.message);
  process.exit(2);
}

let safelist = [];
try {
  const safelistModule = await import(path.resolve(root, 'client', 'safelist.generated.js'));
  safelist = safelistModule.default || [];
} catch (e) {
  console.warn('Warning: could not import safelist.generated.js', e.message);
}

const content = [
  path.resolve(root, 'client', 'dist', 'index.html'),
  path.resolve(root, 'client', 'dist', '*.html'),
  path.resolve(root, 'client', 'dist', '**', '*.js'),
  path.resolve(root, 'client', 'src', '**', '*.{js,jsx,ts,tsx}'),
];

console.log('Purgando CSS:', cssPath);
console.log('Content globs:', content);
console.log('Safelist length:', safelist.length);

try {
  const purgecss = new PurgeCSS();
  const results = await purgecss.purge({ content, css: [cssPath], safelist });
  if (!results || !results.length) {
    console.error('PurgeCSS returned no results');
    process.exit(2);
  }
  const purgedCss = results[0].css;

  const outDir = path.join(clientDistAssets, 'purged');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outCssPath = path.join(outDir, 'index-purged.css');
  fs.writeFileSync(outCssPath, purgedCss, 'utf8');

  // Create preview HTML by replacing stylesheet link in dist/index.html
  const indexHtmlPath = path.resolve(root, 'client', 'dist', 'index.html');
  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  indexHtml = indexHtml.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/i, `<link rel="stylesheet" href="./assets/purged/index-purged.css">`);
  const previewPath = path.resolve(root, 'client', 'dist', 'index-purged.html');
  fs.writeFileSync(previewPath, indexHtml, 'utf8');

  const origSize = fs.statSync(cssPath).size;
  const purgedSize = Buffer.byteLength(purgedCss, 'utf8');
  console.log('Wrote purged CSS to', outCssPath);
  console.log('Original CSS size:', origSize, 'bytes');
  console.log('Purged CSS size:  ', purgedSize, 'bytes');
  process.exit(0);
} catch (err) {
  console.error('Purge failed:', err);
  process.exit(2);
}
