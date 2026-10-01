# Reviewer test instructions

No account, subscription, API key, paid site, or third-party service is required. The popup is Simplified Chinese.

1. Open a disposable regular HTTPS tab that permits scripting, then run the fixture below in its developer console. It replaces that document's body with three locally generated blob images.
2. Click the extension, then **扫描图片** (Scan images). Expect three 120 × 80 images.
3. DOM and visual order differ. The first row is blue on the left and gold on the right; the next row is green. Saved sequence: blue PNG, gold JPEG, green WebP.
4. Click **按顺序下载** (Download in order). Expect a new batch subfolder and three completed images.
5. During a second batch, close and reopen the popup to verify continued downloads. **停止提交** (Stop submitting) stops later submissions; accepted downloads continue.

```javascript
(async () => {
  document.body.replaceChildren();
  document.body.style.cssText = 'margin:0;min-height:700px;background:white';
  for (const item of [
    { color: '#248c73', mime: 'image/webp', x: 0, y: 300 },
    { color: '#e5a531', mime: 'image/jpeg', x: 200, y: 0 },
    { color: '#215bdd', mime: 'image/png', x: 0, y: 15 }
  ]) {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 80;
    const context = canvas.getContext('2d');
    context.fillStyle = item.color;
    context.fillRect(0, 0, 120, 80);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, item.mime));
    const image = document.createElement('img');
    image.src = URL.createObjectURL(blob);
    image.style.cssText = `position:absolute;left:${item.x}px;top:${item.y}px;width:120px;height:80px`;
    document.body.append(image);
    await image.decode();
  }
})();
```

Blob images in the main page and accessible same-origin iframes with both natural dimensions strictly greater than 50 px are included by default. Cross-origin and opaque sandboxed frames are skipped. No auto-scroll, ordinary HTTP image downloads, or browser-internal page access. Limit: 24 MiB per image. No blanket host permissions or remote executable code.
