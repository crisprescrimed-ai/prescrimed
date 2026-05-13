import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve(process.cwd(), 'tmp_visual_compare');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const origBase = process.env.ORIG_BASE_URL || 'http://127.0.0.1:3002';
const newBase = process.env.NEW_BASE_URL || 'http://127.0.0.1:3001';
// Optional: permitir injetar um CSS purgado (URL) para o build NEW via primeiro argumento
const purgedCssUrl = process.argv[2] || process.env.PURGED_CSS_URL || null;

console.log('ORIG_BASE:', origBase, 'NEW_BASE:', newBase);

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// Intercept health checks to avoid 'Backend Offline' banners during visual comparison
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

if (purgedCssUrl) {
  // Quando fornecido, substitui requisições de CSS do build NEW por este CSS purgado
  await page.route('**/assets/*.css', async (route) => {
    try {
      const req = route.request();
      const reqUrl = req.url();
      // Aplicar apenas para solicitações vindas do NEW_BASE (evita afetar orig)
      if (reqUrl.startsWith(newBase) || reqUrl.includes('/assets/') ) {
        const res = await fetch(purgedCssUrl);
        if (res.ok) {
          const body = await res.text();
          await route.fulfill({ status: 200, headers: { 'content-type': 'text/css' }, body });
          return;
        }
      }
    } catch (e) {
      // falhar silenciosamente e permitir a requisição original
    }
    await route.continue();
  });
}

for (const vp of viewports) {
  console.log('Viewport:', vp.name, `${vp.width}x${vp.height}`);
  await page.setViewportSize({ width: vp.width, height: vp.height });

  const origUrl = `${origBase}/index-original.html#/login`;
  const newUrl = `${newBase}/index.html#/login`;

  console.log('  - Capturando ORIGINAL ->', origUrl);
  await page.goto(origUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const origPath = path.join(outDir, `original-${vp.name}.png`);
  await page.screenshot({ path: origPath, fullPage: true });

  console.log('  - Capturando NEW ->', newUrl);
  await page.goto(newUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const newPath = path.join(outDir, `new-${vp.name}.png`);
  await page.screenshot({ path: newPath, fullPage: true });
}

await browser.close();
console.log('Capturas concluídas. Verifique a pasta tmp_visual_compare/');
