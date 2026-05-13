import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve(process.cwd(), 'tmp_visual');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const base = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:3001';

console.log('Base URL:', base);

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// Intercept health checks to avoid offline banners during visual capture
await page.route('**/api/health', route => route.fulfill({
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ database: 'connected' })
}));

await page.route('**/health', route => route.fulfill({
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ database: 'connected' })
}));

for (const vp of viewports) {
  console.log('Viewport:', vp.name, `${vp.width}x${vp.height}`);
  await page.setViewportSize({ width: vp.width, height: vp.height });

  const origUrl = `${base}/index-original.html#/login`;
  const purgedUrl = `${base}/index-purged.html#/login`;

  console.log('  - Capturando ORIGINAL ->', origUrl);
  await page.goto(origUrl, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const origPath = path.join(outDir, `original-${vp.name}.png`);
  await page.screenshot({ path: origPath, fullPage: true });

  console.log('  - Capturando PURGED ->', purgedUrl);
  await page.goto(purgedUrl, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const purgedPath = path.join(outDir, `purged-${vp.name}.png`);
  await page.screenshot({ path: purgedPath, fullPage: true });
}

await browser.close();
console.log('Capturas concluídas. Verifique a pasta tmp_visual/');
