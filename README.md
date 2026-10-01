# Blob Image Downloader

**English** · [简体中文](README.zh-CN.md)

Save the current page's loaded, visible **blob images** in reading order: top to bottom, then left to right within each row. A lightweight Manifest V3 extension for Chrome and Edge, based on a browser-console download script.

No build step, no runtime dependencies, and no background scanning of every website. The current popup interface is in Simplified Chinese.

![Extension popup showing images in download order](docs/popup.png)

## Install

1. Download and extract the ZIP from the [latest release](https://github.com/gulzxeric/blob-image-downloader/releases/latest), or clone this repository.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**, then select **Load unpacked**.
4. For a release ZIP, select the extracted folder containing `manifest.json`. For a Git clone, select the `extension` folder.
5. Pin the extension to the browser toolbar.

You do not need Node.js, npm, or a GitHub account to install it. Store materials are prepared, but the extension has **not yet been submitted to or published in either browser store**.

## Use

1. Open a regular webpage containing blob images. Scroll first to let the desired images load.
2. Click the extension icon, then **扫描图片** (Scan images). Review the count, dimensions, and order.
3. Optionally change **文件名前缀** (Filename prefix) and **下载子文件夹** (Download subfolder). Scan again after changing settings.
4. Select **按顺序下载** (Download in order). The extension rescans the page and creates a separate folder for each batch in your browser's Downloads directory:

   ```text
   Downloads/blob-images/20261001-153000-a12b34/
     image_001.png
     image_002.jpg
     image_003.webp
   ```

5. Check the completed, failed, in-progress, and unsubmitted counts. Hover over a failed item for its error.

Downloads continue when the popup closes; reopening it restores the current session's progress. **停止提交** (Stop submitting) stops further images from entering the queue. Downloads already accepted by the browser continue.

Keep the source page open. Refreshing, closing, or navigating away from it stops images that have not yet been submitted.

## Selection and ordering

- Only main-page `<img>` elements whose `img.src` starts with `blob:` are considered.
- Both natural dimensions must be **strictly greater than 50 px** by default. This threshold is adjustable.
- Unloaded images, images without layout dimensions, hidden or fully transparent images, and images inside hidden ancestors are excluded. Visible fixed-position images are supported.
- Loaded images outside the viewport are included. The extension does not automatically scroll, wait for lazy loading, enter iframes or Shadow DOM, or collect HTTP images and CSS backgrounds.
- Images are first ordered by document Y coordinate. A row includes images whose top lies within the configured tolerance of that row's topmost image. Images in the row are then ordered by X coordinate.
- The default row tolerance is **20 px**. A fixed row anchor avoids the original script's non-transitive fuzzy comparator. Masonry layouts, overlapping images, or nested scroll containers may need a different tolerance.
- If the same blob URL appears in multiple eligible image elements, each occurrence is numbered separately.

## Original formats and limits

Image bytes are preserved without transcoding. PNG, JPEG, WebP, GIF, AVIF, and BMP are identified from their signatures. Other supported formats use the declared MIME type; an unknown format receives a `.bin` extension. Filenames are not forced to `.png`.

Blob URLs belong to their source page and can be revoked. A revoked URL produces a failure even when its previously decoded image remains visible.

The per-image limit is **24 MiB**. Larger images are not downloaded and are reported as failed, keeping extension messages and memory use bounded. Images are read and submitted one at a time, with a default **300 ms** interval adjustable from 100 to 3000 ms.

Browser-internal pages, extension stores, and other protected pages cannot be scanned. For local file webpages, enable **Allow access to file URLs** in the extension's browser settings. Browser or enterprise download policies can still block a save. Your browser controls the main Downloads location; the extension specifies a relative subfolder.

Progress is session-only. Submitted downloads can be reconciled after the popup reopens or the extension service worker sleeps. Unfinished batches are not restored after a browser restart.

## Permissions and privacy

| Permission | Purpose |
| --- | --- |
| `activeTab` | Temporarily access the current webpage after you click the extension |
| `scripting` | Collect and read blob images in that page's main frame |
| `downloads` | Save image files and track actual browser download outcomes |
| `storage` | Store preferences locally and progress for the current browser session |

There are no blanket host permissions, remote scripts, analytics, advertisements, or developer-operated upload endpoints. Image bytes are passed locally between the page, extension, and browser download manager. Only task metadata is stored in session storage.

Read the [privacy policy](PRIVACY.md) for details. The browser itself retains normal download history.

## Development

Use Node.js 22 or later. The extension source can be loaded directly.

```sh
npm ci
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run package
```

End-to-end tests use an isolated temporary browser profile and a localhost image fixture. The test copy temporarily grants `http://127.0.0.1/*` access to simulate the permission normally obtained by clicking the toolbar button. **The release manifest does not include this permission.** Tests produce a `blob-images-e2e` folder in the test browser's downloads location and remove their temporary profile after closing.

Tests cover filtering, visual ordering independent of DOM order, fixed positioning, scrolling, original bytes and formats, revoked URLs, stopping submission, popup interactions, and continued downloads after closing the popup.

`npm run package` creates `dist/blob-image-downloader-v1.0.1.zip` with `manifest.json` and the MIT license at the ZIP root. Regenerate icons with `python scripts/generate-icons.py` (Python standard library only); regenerate store graphics with `npm run store:assets`.

See [store submission materials](store/README.md) for listing copy, permission explanations, review instructions, and graphics.

API references: [Chrome downloads](https://developer.chrome.com/docs/extensions/reference/api/downloads), [script injection](https://developer.chrome.com/docs/extensions/reference/api/scripting), and [session storage](https://developer.chrome.com/docs/extensions/reference/api/storage).

## License

[MIT](LICENSE) © 2026 gulzxeric.
