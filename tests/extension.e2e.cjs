const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const { PDFDocument, PDFName, decodePDFRawStream } = require('pdf-lib');
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
    const file = request.url === '/iframe-only' ? 'iframe-fixture.html' : request.url === '/iframe-image' ? 'iframe-image.html' : 'fixture.html';
    response.end(fs.readFileSync(path.join(__dirname, file)));
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
    // Same symptom as the course viewer: top-level JS sees zero blob images,
    // while the selected DevTools iframe sees a fully loaded slide.
    await fixture.goto(`http://127.0.0.1:${server.address().port}/iframe-only`);
    await fixture.evaluate(() => window.ready);
    assert.equal(await fixture.locator('img').count(), 0);
    assert.equal(await fixture.frameLocator('#course').locator('img').count(), 1);
    const frameScan = await message('SCAN', { options });
    assert.equal(frameScan.ok, true, frameScan.error);
    assert.equal(frameScan.images.length, 1, 'loaded course image inside a same-origin iframe must be found without inspecting it first');
    assert.deepEqual(frameScan.images.map(item => [item.top,item.left]), [[125,70]]);
    const frameStart = await message('START', { options });
    assert.equal(frameStart.ok, true, frameStart.error);
    const frameDone = await until(async () => { const status = await message('GET_STATUS'); return status.job && !status.job.busy && status.job; });
    assert.equal(frameDone.complete, 1);
    assert.equal(frameDone.failed, 0);
    const [frameDownload] = await worker.evaluate(async id => chrome.downloads.search({ id }), frameDone.items[0].downloadId);
    assert.deepEqual(Array.from(fs.readFileSync(frameDownload.filename)), await fixture.evaluate(() => document.getElementById('course').contentWindow.expected));
    // Scrolling either document must preserve the course's reading order.
    await fixture.evaluate(() => { scrollTo(0, 50); document.getElementById('course').contentWindow.scrollTo(0, 40); });
    assert.deepEqual((await message('SCAN', { options })).images.map(item => [item.top,item.left]), [[125,70]]);
    await fixture.evaluate(async () => {
      scrollTo(0, 0);
      const course = document.getElementById('course');
      course.contentWindow.scrollTo(0, 0);
      const nested = course.contentDocument.createElement('iframe');
      nested.id = 'nested';
      nested.style.cssText = 'position:absolute;top:200px;left:100px;width:200px;height:150px;border:3px solid black';
      nested.src = '/iframe-image';
      const loaded = new Promise(resolve => nested.onload = resolve);
      course.contentDocument.body.append(nested);
      await loaded; await nested.contentWindow.ready;
    });
    assert.deepEqual((await message('SCAN', { options })).images.map(item => [item.top,item.left]), [[125,70],[328,173]], 'nested frame positions include each frame border');
    await fixture.evaluate(() => { document.getElementById('course').contentDocument.getElementById('nested').style.visibility = 'hidden'; });
    assert.equal((await message('SCAN', { options })).images.length, 1, 'hidden nested frame images must be excluded');
    await fixture.evaluate(() => { document.getElementById('course').style.opacity = '0'; });
    assert.equal((await message('SCAN', { options })).images.length, 0, 'hidden frame ancestors must exclude all their images');
    await fixture.evaluate(async () => {
      document.getElementById('course').style.opacity = '1';
      const opaque = document.createElement('iframe');
      opaque.sandbox = 'allow-scripts';
      opaque.src = '/iframe-image';
      const loaded = new Promise(resolve => opaque.onload = resolve);
      document.body.append(opaque);
      await loaded;
      if (opaque.contentDocument) throw new Error('Expected an inaccessible sandboxed frame');
    });
    assert.equal((await message('SCAN', { options })).images.length, 1, 'inaccessible frames must not break scanning');
    await fixture.goto(`http://127.0.0.1:${server.address().port}`);
    await fixture.evaluate(() => window.ready);
    const scan = await message('SCAN', { options });
    assert.equal(scan.ok, true, scan.error);
    assert.equal(scan.images.length, 5, 'include same-origin iframe images; exclude hidden, <=50px and non-blob images');
    assert.deepEqual(scan.images.map(item => [item.top, item.left]), [[15,0],[0,200],[150,0],[500,0],[1000,0]]);
    const started = await message('START', { options });
    assert.equal(started.ok, true, started.error);
    const done = await until(async () => { const status = await message('GET_STATUS'); return status.job && !status.job.busy && status.job; });
    assert.equal(done.complete, 5);
    assert.equal(done.failed, 0);
    assert.deepEqual(done.items.map(item => path.extname(item.filename)), ['.png','.jpg','.png','.webp','.png']);
    const expected = await fixture.evaluate(() => window.expected);
    for (const [index, id] of ['left','right','fixed','bottom','frame'].entries()) {
      const [download] = await worker.evaluate(async id => chrome.downloads.search({ id }), done.items[index].downloadId);
      assert.deepEqual(Array.from(fs.readFileSync(download.filename)), expected[id], 'downloaded bytes must match original blob');
    }
    // A PDF uses the same visual order and saves one document, not five images.
    const pdfStart = await message('START', { options, mode: 'pdf' });
    assert.equal(pdfStart.ok, true, pdfStart.error);
    const pdfDone = await until(async () => { const { job } = await message('GET_STATUS'); return job && !job.busy && job; });
    assert.equal(pdfDone.pdf.state, 'complete', JSON.stringify(pdfDone));
    assert.equal(pdfDone.complete, 5);
    assert.ok(pdfDone.items.every(item => !item.downloadId));
    const [pdfDownload] = await worker.evaluate(async id => chrome.downloads.search({ id }), pdfDone.pdf.downloadId);
    const pdfBytes = fs.readFileSync(pdfDownload.filename);
    fs.writeFileSync(path.join(artifacts, 'ordered-images.pdf'), pdfBytes);
    const pdf = await PDFDocument.load(pdfBytes);
    assert.equal(pdf.getPageCount(), 5);
    const colors = [[33,91,221], null, [116,74,198], [36,140,115], [85,85,85]];
    for (const [index, page] of pdf.getPages().entries()) {
      assert.deepEqual(page.getSize(), { width: 90, height: 60 });
      const objects = page.node.Resources().lookup(PDFName.of('XObject'));
      const stream = objects.lookup(objects.keys()[0]);
      if (index === 1) assert.deepEqual(Array.from(stream.getContents()), expected.right, 'JPEG is embedded without recompression');
      else {
        const pixel = Array.from(decodePDFRawStream(stream).decode().slice(0, 3));
        pixel.forEach((value, channel) => assert.ok(Math.abs(value - colors[index][channel]) <= 3, `page ${index + 1} has the expected image/color`));
      }
    }
    // Scroll-invariance of document coordinates.
    await fixture.evaluate(() => scrollTo(0, 300));
    const scrolled = await message('SCAN', { options });
    assert.deepEqual(scrolled.images.map(item => [item.top,item.left]), [[15,0],[0,200],[450,0],[500,0],[1000,0]]);
    await fixture.evaluate(() => scrollTo(0, 0));
    // A decoded image can remain visible after its object URL is revoked.
    await fixture.evaluate(() => URL.revokeObjectURL(document.getElementById('left').src));
    await message('START', { options });
    const failed = await until(async () => { const status = await message('GET_STATUS'); return status.job && !status.job.busy && status.job; });
    assert.equal(failed.failed, 1);
    assert.equal(failed.complete, 4);
    assert.equal(failed.items[0].state, 'failed');
    await message('START', { options, mode: 'pdf' });
    const pdfFailed = await until(async () => { const { job } = await message('GET_STATUS'); return job && !job.busy && job; });
    assert.equal(pdfFailed.pdf.state, 'failed');
    assert.equal(pdfFailed.pdf.downloadId, undefined, 'never silently export an incomplete PDF');
    assert.match(pdfFailed.pdf.error, /第 1 张图片/);
    assert.equal(pdfFailed.skipped, 4);
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
    await until(async () => (await popup.locator('#image-count').textContent()) === '5 张');
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
    await until(async () => (await reopened.locator('#status').textContent()).includes('已保存 4 张 · 失败 1 张 · 保存中 0 张'));
    assert.equal(await reopened.locator('#result-heading').textContent(), '本次下载已结束');
    // Restore valid images, start PDF through the UI, and close the popup.
    await fixture.reload();
    await fixture.evaluate(() => window.ready);
    await fixture.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 60; canvas.height = 180;
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      const image = document.getElementById('fixed');
      image.src = URL.createObjectURL(blob); await image.decode();
    });
    await reopened.locator('#scan').click();
    await until(async () => (await reopened.locator('#image-count').textContent()) === '5 张');
    await reopened.locator('body').screenshot({ path: path.join(artifacts, 'popup-pdf.png') });
    await reopened.locator('#pdf').click();
    await until(async () => !(await reopened.locator('#stop').isHidden()));
    await reopened.close();
    const pdfStatus = await browser.newPage();
    await pdfStatus.goto(`chrome-extension://${extensionId}/popup.html`);
    const pdfMessage = (type, extra = {}) => pdfStatus.evaluate(async args => chrome.runtime.sendMessage(args), { type, tabId, ...extra });
    const backgroundPdf = await until(async () => { const { job } = await pdfMessage('GET_STATUS'); return job && !job.busy && job; });
    assert.equal(backgroundPdf.pdf.state, 'complete', JSON.stringify(backgroundPdf));
    const [backgroundDownload] = await worker.evaluate(async id => chrome.downloads.search({ id }), backgroundPdf.pdf.downloadId);
    const mixedPdfBytes = fs.readFileSync(backgroundDownload.filename);
    fs.writeFileSync(path.join(artifacts, 'mixed-sizes.pdf'), mixedPdfBytes);
    const mixedPdf = await PDFDocument.load(mixedPdfBytes);
    assert.deepEqual(mixedPdf.getPages()[2].getSize(), { width: 45, height: 135 }, 'portrait images keep their own aspect ratio');
    const transparentImages = mixedPdf.getPages()[2].node.Resources().lookup(PDFName.of('XObject'));
    assert.ok(transparentImages.lookup(transparentImages.keys()[0]).dict.has(PDFName.of('SMask')), 'transparent PNG keeps its alpha mask');
    // Cancel a PDF after an image has entered the document.
    await pdfMessage('START', { options: { ...options, interval: 1000 }, mode: 'pdf' });
    await until(async () => (await pdfMessage('GET_STATUS')).job.complete === 1);
    await pdfMessage('STOP');
    const cancelledPdf = await until(async () => { const { job } = await pdfMessage('GET_STATUS'); return job && !job.busy && job; });
    assert.equal(cancelledPdf.pdf.state, 'failed');
    assert.equal(cancelledPdf.pdf.downloadId, undefined);
    assert.ok(cancelledPdf.skipped > 0);
    assert.match(cancelledPdf.pdf.error, /已停止合并/);
    assert.equal(await worker.evaluate(async id => (await pdfRequest('PDF_HAS', id)).exists, cancelledPdf.id), false, 'cancelled PDF memory is released');
    console.log('PDF E2E passed: page order/colors, JPEG bytes, WebP conversion, page ratios, transparency, failed blobs, stopping and popup closure.');
    console.log('E2E passed: course iframe discovery and byte preservation, filtering, visual order, fixed images, formats, scrolling, revoked blobs, stopping, popup UI and continued downloads after closing popup.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    // Only remove the exact freshly created temporary profile.
    if (profile.startsWith(path.join(os.tmpdir(), 'blob-images-e2e-'))) fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
