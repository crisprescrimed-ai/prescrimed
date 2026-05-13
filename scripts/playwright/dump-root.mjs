import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/playwright/dump-root.mjs <url>');
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage();
console.log('Loading', url);
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const result = await page.evaluate(() => {
  const root = document.querySelector('#root');
  if (!root) return { rootExists: false };
  const html = root.innerHTML || '';
  const nodeCount = root.getElementsByTagName('*').length;
  const classList = Array.from(document.querySelectorAll('[class]')).map(el => el.className).slice(0,200);
  return { rootExists: true, length: html.length, nodeCount, sample: html.slice(0,800), classesSample: classList };
});

await browser.close();
console.log(JSON.stringify(result, null, 2));
