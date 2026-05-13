import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/playwright/collect-errors.mjs <url>');
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
page.on('pageerror', err => console.log('PAGE_ERROR:', err.message));
page.on('requestfailed', req => console.log('REQUEST_FAILED:', req.url(), req.failure()?.errorText));
page.on('response', res => {
  try {
    const status = res.status();
    if (status >= 400) console.log('BAD_RESPONSE:', status, res.url());
  } catch (e) {}
});

console.log('Loading', url);
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const rootExists = await page.$('#root');
console.log('rootExists:', !!rootExists);

await browser.close();
console.log('Done');
