const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'store', 'assets');
fs.mkdirSync(output, { recursive: true });
const allowed = new Map([
  ['/store/preview.html', ['store/preview.html', 'text/html; charset=utf-8']],
  ['/extension/icons/icon128.png', ['extension/icons/icon128.png', 'image/png']],
  ['/docs/popup.png', ['docs/popup.png', 'image/png']]
]);
const server = http.createServer((request, response) => {
  const entry = allowed.get(new URL(request.url, 'http://localhost').pathname);
  if (!entry) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', entry[1]);
  response.end(fs.readFileSync(path.join(root, entry[0])));
});
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const base = `http://127.0.0.1:${server.address().port}/store/preview.html`;
    await page.goto(base);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode())); });
    await page.screenshot({ path: path.join(output, 'screenshot-1280x800.png') });
    await page.setViewportSize({ width: 440, height: 280 });
    await page.goto(`${base}?view=promo`);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode())); });
    await page.screenshot({ path: path.join(output, 'promo-440x280.png') });
    console.log(output);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
