import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const url = process.argv[2] || process.env.GENERATE_SAFELIST_URL || 'http://127.0.0.1:3001/index.html';
const outPath = path.resolve('client', 'safelist.generated.js');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  console.log('Loading', url);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const classes = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[class]'));
    const set = new Set();
    els.forEach(el => {
      const clsAttr = el.getAttribute && el.getAttribute('class');
      const cls = typeof clsAttr === 'string' ? clsAttr : '';
      if (!cls) return;
      cls.split(/\s+/).forEach(token => {
        if (token && token !== 'undefined' && token.trim() !== '') set.add(token.trim());
      });
    });
    return Array.from(set).sort();
  });

  await browser.close();

  const exported = `export default ${JSON.stringify(classes, null, 2)};\n`;
  fs.writeFileSync(outPath, exported, 'utf8');
  console.log('Wrote', outPath, classes.length, 'classes');
})();
