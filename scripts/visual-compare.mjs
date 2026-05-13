import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const outDir = path.resolve(process.cwd(), 'tmp_visual');
const viewports = ['desktop','tablet','mobile'];

let exitCode = 0;
for (const vp of viewports) {
  const a = path.join(outDir, `original-${vp}.png`);
  const b = path.join(outDir, `purged-${vp}.png`);
  const diffPath = path.join(outDir, `diff-${vp}.png`);

  if (!fs.existsSync(a) || !fs.existsSync(b)) {
    console.error('Arquivos faltando para comparação:', a, b);
    exitCode = 2;
    continue;
  }

  const img1 = PNG.sync.read(fs.readFileSync(a));
  const img2 = PNG.sync.read(fs.readFileSync(b));

  if (img1.width !== img2.width || img1.height !== img2.height) {
    console.error(`Dimensões diferentes para ${vp}: ${img1.width}x${img1.height} vs ${img2.width}x${img2.height}`);
    exitCode = 2;
    continue;
  }

  const { width, height } = img1;
  const diff = new PNG({ width, height });
  const numDiff = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.08 });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  const pct = (numDiff / (width * height)) * 100;
  console.log(`${vp}: ${numDiff} pixels diferentes (${pct.toFixed(4)}%) — diff salvo em ${diffPath}`);
  if (pct > 0.5) exitCode = 1;
}

process.exit(exitCode);
