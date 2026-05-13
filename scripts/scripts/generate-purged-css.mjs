import fs from 'fs';
import path from 'path';

const root = process.cwd();
const distAssets = path.resolve(root, 'dist', 'assets');
if (!fs.existsSync(distAssets)) {
  console.error('client/dist/assets not found. Run build first.');
  process.exit(2);
}

const cssFiles = fs.readdirSync(distAssets).filter(f => f.endsWith('.css') && f.startsWith('index-'));
if (!cssFiles.length) {
  console.error('No index-*.css found in dist/assets');
  process.exit(2);
}
const cssPath = path.join(distAssets, cssFiles[0]);

let PurgeCSS;
try {
  const mod = await import('purgecss');
  PurgeCSS = mod.PurgeCSS || mod.default?.PurgeCSS || mod.default || mod;
} catch (e) {
  console.error('Failed to import purgecss from client/node_modules:', e.message);
  process.exit(2);
}

import { pathToFileURL } from 'url';

let safelist = [];
try {
  const safelistPath = path.resolve(root, 'safelist.generated.js');
  const safelistModule = await import(pathToFileURL(safelistPath).href);
  safelist = safelistModule.default || [];
} catch (e) {
  console.warn('Warning: could not import safelist.generated.js in client:', e.message);
}

// Use relative globs (resolved against process.cwd which is client/) to be compatible with PurgeCSS
const content = [
  'dist/index.html',
  'dist/**/*.html',
  'dist/**/*.js',
  'src/**/*.{js,jsx,ts,tsx}',
];

console.log('Purgando CSS:', cssPath);
console.log('Content globs:', content);
console.log('Safelist length:', safelist.length);

try {
  // Read CSS as raw string and load content files as raw to avoid Windows path/glob issues
  const cssStr = fs.readFileSync(cssPath, 'utf8');
  const contentRaw = [];
  // index.html
  const indexHtmlPath = path.resolve(root, 'dist', 'index.html');
  contentRaw.push({ raw: fs.readFileSync(indexHtmlPath, 'utf8'), extension: 'html' });
  // all JS files in dist/assets
  const jsFiles = fs.readdirSync(path.join(root, 'dist', 'assets')).filter(f => f.endsWith('.js'));
  for (const jf of jsFiles) {
    const jfPath = path.join(root, 'dist', 'assets', jf);
    contentRaw.push({ raw: fs.readFileSync(jfPath, 'utf8'), extension: 'js' });
  }

  const purgecss = new PurgeCSS();
  const results = await purgecss.purge({ content: contentRaw, css: [{ raw: cssStr }], safelist });
  if (!results || !results.length) {
    console.error('PurgeCSS returned no results');
    process.exit(2);
  }
  const purgedCss = results[0].css;

  const outDir = path.join(distAssets, 'purged');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outCssPath = path.join(outDir, 'index-purged.css');
  fs.writeFileSync(outCssPath, purgedCss, 'utf8');

  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  indexHtml = indexHtml.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/i, `<link rel="stylesheet" href="./assets/purged/index-purged.css">`);
  const previewPath = path.resolve(root, 'dist', 'index-purged.html');
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
