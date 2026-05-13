import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const srcDir = path.join(cwd, 'tmp_visual');
const destDir = path.join(cwd, 'tmp_visual_compare');
if (!fs.existsSync(srcDir)) {
  console.error('tmp_visual not found');
  process.exit(2);
}
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

const viewports = ['desktop','tablet','mobile'];
for (const vp of viewports) {
  const orig = path.join(srcDir, `original-${vp}.png`);
  const purged = path.join(srcDir, `purged-${vp}.png`);
  const destOrig = path.join(destDir, `original-${vp}.png`);
  const destNew = path.join(destDir, `new-${vp}.png`);
  if (!fs.existsSync(orig) || !fs.existsSync(purged)) {
    console.error('Missing capture files for', vp);
    process.exit(2);
  }
  fs.copyFileSync(orig, destOrig);
  fs.copyFileSync(purged, destNew);
}
console.log('Prepared images in', destDir);
process.exit(0);
