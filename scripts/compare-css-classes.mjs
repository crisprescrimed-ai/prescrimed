import fs from 'fs';
import path from 'path';

function usage() {
  console.log('Usage: node scripts/compare-css-classes.mjs <before-dist-path> <after-dist-path>');
  process.exit(2);
}

const beforeDir = process.argv[2];
const afterDir = process.argv[3];
if (!beforeDir || !afterDir) usage();

function findIndexCss(dir) {
  const assetsDir = path.join(dir, 'assets');
  if (!fs.existsSync(assetsDir)) throw new Error(`Assets dir not found: ${assetsDir}`);
  const files = fs.readdirSync(assetsDir);
  const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
  if (!cssFile) throw new Error(`index-*.css not found in ${assetsDir}`);
  return path.join(assetsDir, cssFile);
}

function extractClasses(cssText) {
  const regex = /\.([a-zA-Z0-9\\:\[\]\\-_/%.]+)[\s\{,\.:>]/g;
  const set = new Set();
  let m;
  while ((m = regex.exec(cssText)) !== null) {
    let cls = m[1];
    // Unescape common escapes used by Tailwind (\: for colon, \\ for backslash, \/ for slash)
    cls = cls.replace(/\\\\/g, '\\').replace(/\\:/g, ':').replace(/\\\//g, '/');
    set.add(cls);
  }
  return set;
}

const beforeCssPath = findIndexCss(beforeDir);
const afterCssPath = findIndexCss(afterDir);

const beforeCss = fs.readFileSync(beforeCssPath, 'utf8');
const afterCss = fs.readFileSync(afterCssPath, 'utf8');

const beforeClasses = extractClasses(beforeCss);
const afterClasses = extractClasses(afterCss);

const missing = [...beforeClasses].filter(c => !afterClasses.has(c));

console.log(`Before CSS: ${beforeCssPath}`);
console.log(`After CSS: ${afterCssPath}`);
console.log(`Found ${beforeClasses.size} classes in before CSS, ${afterClasses.size} in after CSS.`);
console.log(`Classes present in BEFORE but MISSING in AFTER: ${missing.length}`);

// Show top 200 missing (sorted alphabetically)
missing.sort();
missing.slice(0,200).forEach(c => console.log(c));

// Write to file so caller can read
const outPath = path.join(process.cwd(), 'tmp_visual_compare', 'missing-classes.txt');
if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, missing.join('\n'), 'utf8');
console.log('Missing classes saved to', outPath);
