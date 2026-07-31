import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const dir = path.resolve(process.cwd(), 'tmp_visual_compare');
const viewports = ['desktop', 'tablet', 'mobile'];

if (!fs.existsSync(dir)) {
  console.error('Diretório tmp_visual_compare não encontrado. Execute capture-compare.mjs primeiro.');
  process.exit(1);
}

for (const vp of viewports) {
  const origPath = path.join(dir, `original-${vp}.png`);
  const newPath = path.join(dir, `new-${vp}.png`);
  const diffPath = path.join(dir, `diff-${vp}.png`);

  if (!fs.existsSync(origPath) || !fs.existsSync(newPath)) {
    console.warn(`Ignorando ${vp}: falta original ou new capture`);
    continue;
  }

  const img1 = PNG.sync.read(fs.readFileSync(origPath));
  const img2 = PNG.sync.read(fs.readFileSync(newPath));
  if (img1.width !== img2.width || img1.height !== img2.height) {
    console.warn(`Tamanhos diferentes para ${vp}: ${img1.width}x${img1.height} vs ${img2.width}x${img2.height}`);
  }

  const width = Math.min(img1.width, img2.width);
  const height = Math.min(img1.height, img2.height);

  // Função utilitária para cortar a imagem para a largura/altura desejadas
  function cropPNG(src, w, h) {
    const out = new PNG({ width: w, height: h });
    for (let y = 0; y < h; y++) {
      const srcStart = (y * src.width) * 4;
      const srcEnd = srcStart + w * 4;
      const destStart = (y * w) * 4;
      const row = src.data.subarray(srcStart, srcEnd);
      out.data.set(row, destStart);
    }
    return out;
  }

  const c1 = (img1.width === width && img1.height === height) ? img1 : cropPNG(img1, width, height);
  const c2 = (img2.width === width && img2.height === height) ? img2 : cropPNG(img2, width, height);

  const diff = new PNG({ width, height });

  const mismatches = pixelmatch(
    c1.data,
    c2.data,
    diff.data,
    width,
    height,
    { threshold: 0.12, includeAA: true }
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const total = width * height;
  const pct = ((mismatches / total) * 100).toFixed(4);

  console.log(`Viewport: ${vp}`);
  console.log(`  Mismatches: ${mismatches} / ${total} (${pct}%)`);
  console.log(`  Diff salvo em: ${path.relative(process.cwd(), diffPath)}`);
  console.log('');
}

console.log('Comparação concluída.');
