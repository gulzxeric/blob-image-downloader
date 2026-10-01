const { test } = require('node:test');
const assert = require('node:assert/strict');
const helpers = require('../extension/common.js');

test('reading order is independent of DOM order, with a stable row anchor', () => {
  const images = [
    { id: 'second-row', top: 30, left: 0 },
    { id: 'right', top: 0, left: 200 },
    { id: 'left', top: 15, left: 0 },
    { id: 'bottom', top: 200, left: 0 }
  ];
  assert.deepEqual(helpers.sortImages(images, 20).map(image => image.id), ['left', 'right', 'second-row', 'bottom']);
  assert.equal(images[0].id, 'second-row');
});
test('row threshold is inclusive, scroll coordinates and ties stay deterministic', () => {
  const images = [{ id: 'b', top: 1000, left: 200 }, { id: 'a', top: 1020, left: 10 }, { id: 'c', top: 1021, left: 0 }];
  assert.deepEqual(helpers.sortImages(images, 20).map(image => image.id), ['a', 'b', 'c']);
  assert.deepEqual(helpers.sortImages([{ id: 1, top: 0, left: 0 }, { id: 2, top: 0, left: 0 }], 0).map(image => image.id), [1, 2]);
});
test('filename inputs cannot escape Downloads or use Windows reserved names', () => {
  const sanitized = helpers.safeName('../foo/bar', 'image');
  assert.equal(/[\\/]|\.\./.test(sanitized), false);
  assert.equal(helpers.safeName('CON', 'image'), '_CON');
  assert.equal(helpers.safeName(' . ', 'image'), 'image');
  assert.equal(helpers.safeName('课件', 'image'), '课件');
  const options = helpers.normalizeOptions({ minSize: -1, rowTolerance: 999, interval: 'bad', prefix: 'a:b', folder: 'x\\y' });
  assert.deepEqual(options, { minSize: 0, rowTolerance: 200, interval: 300, prefix: 'a_b', folder: 'x_y' });
});
test('actual file signatures win over an incorrect declared MIME', () => {
  assert.equal(helpers.detectMime(Uint8Array.from([137,80,78,71,13,10,26,10]), 'image/jpeg'), 'image/png');
  assert.equal(helpers.detectMime(Uint8Array.from([255,216,255]), ''), 'image/jpeg');
  assert.equal(helpers.detectMime(Buffer.from('RIFF1234WEBP'), ''), 'image/webp');
  assert.equal(helpers.detectMime(Buffer.from('GIF89a'), ''), 'image/gif');
  assert.equal(helpers.extensionFor('image/jpeg; charset=utf-8'), 'jpg');
  assert.equal(helpers.extensionFor('unknown'), 'bin');
  assert.equal(helpers.filename('batch', 'image', 0, 9, 'image/webp'), 'batch/image_001.webp');
  assert.equal(helpers.filename('batch', 'image', 9, 10000, 'image/png'), 'batch/image_00010.png');
});
test('progress reports completed downloads separately from accepted requests', () => {
  const job = { submitting: false, items: ['complete','failed','in_progress','skipped'].map(state => ({ state })) };
  assert.deepEqual(Object.fromEntries(Object.entries(helpers.summary(job)).filter(([key]) => ['total','complete','failed','pending','skipped','busy'].includes(key))),
    { total: 4, complete: 1, failed: 1, pending: 1, skipped: 1, busy: true });
  assert.equal(helpers.summary(null), null);
});
