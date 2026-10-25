# Reviewer test instructions

No account, subscription, API key, paid site, or third-party service is required. The popup is Simplified Chinese.

1. Open a disposable regular HTTPS tab that permits scripting, then run the fixture below in its developer console. It replaces that document's body with three locally generated blob images.
2. Click the extension, then **扫描图片** (Scan images). Expect three 120 × 80 images.
3. DOM and visual order differ. The first row is blue on the left and gold on the right; the next row is green. Saved sequence: blue PNG, gold JPEG, green WebP.
4. Click **按顺序下载** (Download in order). Expect a new batch subfolder and three completed images.
5. During a second batch, close and reopen the popup to verify continued downloads. **停止提交** (Stop submitting) stops later submissions; accepted downloads continue.
6. Scan again and click **合并为 PDF** (Merge to PDF). Expect one PDF in a new batch subfolder, with three pages ordered blue, gold, then green. Each page is 90 × 60 PDF points, retaining the 120 × 80 image proportions. No separate image files are saved in this mode.
7. Start another PDF batch, close the popup, then reopen it. Processing continues and the popup shows the final PDF download status.
8. Increase the submission interval, scan again, start a PDF batch, and click **停止合并** (Stop merging) before collection ends. Expect no incomplete PDF. Rescan and retry to produce the full document.
9. For a failure case, revoke the first image's URL in the console with `URL.revokeObjectURL(document.images[2].src)`, then scan and merge again. The decoded image can remain visible, but reading its data fails. Expect a failed merge with an error and no incomplete PDF.

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

Blob images in the main page and accessible same-origin iframes with both natural dimensions strictly greater than 50 px are included by default. Cross-origin and opaque sandboxed frames are skipped. No auto-scroll, ordinary HTTP image downloads, or browser-internal page access. Limit: 24 MiB per source image. PDF mode additionally limits each image to 40 million pixels and the batch to 256 MiB, counting the larger of each source and converted file size. Keep the source tab open during collection. No blanket host permissions or remote executable code.

The `offscreen` permission is used only for a hidden, packaged extension document that decodes images, combines them using the locally bundled PDF library, and holds a temporary download Blob URL. It does not upload content or load remote code.
