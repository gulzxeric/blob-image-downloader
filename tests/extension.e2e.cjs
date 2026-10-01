const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const extension = path.join(root, 'extension');
const artifacts = path.join(root, '.artifacts');
fs.mkdirSync(artifacts, { recursive: true });

function serve(server) { return new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); }
async function until(callback, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await callback();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for extension result');
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'blob-images-e2e-'));
  const testExtension = path.join(profile, 'test-extension');
  fs.cpSync(extension, testExtension, { recursive: true });
  const manifestPath = path.join(testExtension, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.host_permissions = ['http://127.0.0.1/*'];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(fs.readFileSync(path.join(__dirname, 'fixture.html')));
  });
  let browser;
  try {
    await serve(server);
    browser = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true, acceptDownloads: true,
      args: [`--disable-extensions-except=${testExtension}`, `--load-extension=${testExtension}`],
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {})
    });
    const worker = browser.serviceWorkers()[0] || await browser.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    const fixture = await browser.newPage();
    await fixture.goto(`http://127.0.0.1:${server.address().port}`);
    await fixture.evaluate(() => window.ready);
    const tabId = await worker.evaluate(async () => (await chrome.tabs.query({})).find(tab => tab.url?.includes('127.0.0.1')).id);
    const popup = await browser.newPage();
    await popup.addInitScript(targetTabId => {
      const query = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = async options => options.active
        ? (await query({})).filter(tab => tab.id === targetTabId) : query(options);
    }, tabId);
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    // Loading popup.html as a tab lacks toolbar activeTab grants. Give only this
    // test build localhost host access (see README test instructions).
    const message = (type, extra = {}) => popup.evaluate(async ({ type, tabId, extra }) => chrome.runtime.sendMessage({ type, tabId, ...extra }), { type, tabId, extra });
    const options = { minSize: 50, rowTolerance: 20, interval: 100, prefix: 'image', folder: 'blob-images-e2e' };
    const scan = await message('SCAN', { options });
    assert.equal(scan.ok, true, scan.error);
    assert.equal(scan.images.length, 4, 'hidden, <=50px, non-blob and iframe images must be excluded');
    assert.deepEqual(scan.images.map(item => [item.top, item.left]), [[15,0],[0,200],[150,0],[500,0]]);
    const started = await message('START', { options });
    assert.equal(started.ok, true, started.error);
    const done = await until(async () => { const status = await message('GET_STATUS'); return status.job && !status.job.busy && status.job; });
    assert.equal(done.complete, 4);
    assert.equal(done.failed, 0);
    assert.deepEqual(done.items.map(item => path.extname(item.filename)), ['.png','.jpg','.png','.webp']);
    const expected = await fixture.evaluate(() => window.expected);
    for (const [index, id] of ['left','right','fixed','bottom'].entries()) {
      const [download] = await worker.evaluate(async id => chrome.downloads.search({ id }), done.items[index].downloadId);
      assert.deepEqual(Array.from(fs.readFileSync(download.filename)), expected[id], 'downloaded bytes must match original blob');
    }
    // Scroll-invariance of document coordinates.
    await fixture.evaluate(() => scrollTo(0, 300));
    const scrolled = await message('SCAN', { options });
    assert.deepEqual(scrolled.images.map(item => [item.top,item.left]), [[15,0],[0,200],[450,0],[500,0]]);
    await fixture.evaluate(() => scrollTo(0, 0));
    // A decoded image can remain visible after its object URL is revoked.
    await fixture.evaluate(() => URL.revokeObjectURL(document.getElementById('left').src));
    await message('START', { options });
    const failed = await until(async () => { const status = await message('GET_STATUS'); return status.job && !status.job.busy && status.job; });
    assert.equal(failed.failed, 1);
    assert.equal(failed.complete, 3);
    assert.equal(failed.items[0].state, 'failed');
    // Stop should leave pending browser saves running and mark unsubmitted items.
    await message('START', { options: { ...options, interval: 1000 } });
    await until(async () => (await message('GET_STATUS')).job.items[0].state === 'failed');
    await message('STOP');
    const stopped = (await message('GET_STATUS')).job;
    assert.equal(stopped.submitting, false);
    assert.ok(stopped.skipped >= 2);
    await until(async () => !(await message('GET_STATUS')).job.busy);
    // Actual popup UI against the active fixture, via test-only override.
    await fixture.bringToFront();
    await popup.locator('#scan').click();
    await until(async () => (await popup.locator('#image-count').textContent()) === '4 张');
    await popup.locator('body').screenshot({ path: path.join(artifacts, 'popup.png') });
    // Start through the real UI, close it during submission, then reopen it.
    await popup.locator('#download').click();
    await until(async () => !(await popup.locator('#stop').isHidden()));
    await popup.close();
    const reopened = await browser.newPage();
    await reopened.addInitScript(targetTabId => {
      const query = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = async options => options.active
        ? (await query({})).filter(tab => tab.id === targetTabId) : query(options);
    }, tabId);
    await reopened.goto(`chrome-extension://${extensionId}/popup.html`);
    await until(async () => (await reopened.locator('#status').textContent()).includes('已保存 3 张 · 失败 1 张 · 保存中 0 张'));
    assert.equal(await reopened.locator('#result-heading').textContent(), '本次下载已结束');
    console.log('E2E passed: filtering, visual order, fixed images, byte preservation, formats, scrolling, revoked blobs, stopping, popup UI and continued downloads after closing popup.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    // Only remove the exact freshly created temporary profile.
    if (profile.startsWith(path.join(os.tmpdir(), 'blob-images-e2e-'))) fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
