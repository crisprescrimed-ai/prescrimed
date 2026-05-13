import fs from 'fs';
import path from 'path';
const root = process.cwd();
const safelistPath = path.resolve(root, 'dist', 'safelist.json');
if (!fs.existsSync(safelistPath)) {
  console.error('dist/safelist.json not found');
  process.exit(2);
}
const safelist = JSON.parse(fs.readFileSync(safelistPath, 'utf8'));
const cssFiles = fs.readdirSync(path.join(root,'dist','assets')).filter(f => f.endsWith('.css') && f.startsWith('index-'));
if (!cssFiles.length) {
  console.error('index-*.css not found in dist/assets');
  process.exit(2);
}
const cssFile = `dist/assets/${cssFiles[0]}`;
const cfg = {
  content: ['dist/index.html', 'dist/**/*.js'],
  css: [cssFile],
  safelist: safelist,
  output: 'dist/assets/purged'
};
fs.writeFileSync(path.resolve(root,'purgecss.config.json'), JSON.stringify(cfg, null, 2), 'utf8');
console.log('Wrote purgecss.config.json');
