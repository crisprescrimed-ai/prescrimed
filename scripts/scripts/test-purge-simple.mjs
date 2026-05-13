import fs from 'fs';
import path from 'path';
const { PurgeCSS } = await import('purgecss');

const root = process.cwd();
const cssFiles = fs.readdirSync(path.join(root,'dist','assets')).filter(f => f.endsWith('.css') && f.startsWith('index-'));
const cssPath = path.join(root,'dist','assets', cssFiles[0]);
const indexHtml = fs.readFileSync(path.join(root,'dist','index.html'),'utf8');

console.log('Testing purge with raw HTML content...');
console.log('CSS path:', cssPath);
console.log('CSS exists:', fs.existsSync(cssPath));
console.log('CSS size:', fs.statSync(cssPath).size);
const results = await new PurgeCSS().purge({
  content: [{ raw: indexHtml, extension: 'html' }],
  css: [cssPath]
});
console.log('Results length:', results.length);
if (results[0]) {
  console.log('Purged css size:', results[0].css.length);
}
