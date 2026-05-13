import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const root = process.cwd();
const safelistModule = await import(pathToFileURL(path.resolve(root, 'safelist.generated.js')).href);
const safelist = safelistModule.default || [];
const outPath = path.resolve(root, 'dist', 'safelist.json');
fs.writeFileSync(outPath, JSON.stringify(safelist, null, 2), 'utf8');
console.log('Wrote', outPath, 'entries:', safelist.length);
