# Blob Image Downloader & PDF Merger

**English** · [简体中文](README.zh-CN.md)

A Chrome / Edge extension that collects loaded, visible **blob images** from the current webpage in reading order. Save the original images, or merge them into **one PDF with one image per page**.

Version **1.1.0** · Manifest V3 · Local processing · No build step

![Extension popup with Scan, Download in order, and Merge to PDF buttons](docs/popup.png)

## Features

| | Download images | Merge to PDF |
| --- | --- | --- |
| Output | One numbered file per image | One PDF for the entire batch |
| Order | Top to bottom; left to right within each row | The same order, one image per page |
| Image handling | Original bytes and formats | JPEG embedded directly; other decodable formats converted to PNG |
| Layout | Original image dimensions | Each page preserves its image's aspect ratio |
| Closing the popup | Downloads continue | Processing and saving continue |
| Failed image | Other images can still download | Stops without exporting an incomplete PDF |

The popup interface is Simplified Chinese. Main-page and accessible same-origin iframe images are supported, including nested course viewers.

## Install or update

1. Select **Code → Download ZIP** on GitHub and extract it, or clone this repository:

   ```sh
   git clone https://github.com/gulzxeric/blob-image-downloader.git
   ```

2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode** and select **Load unpacked**.
4. Select this repository's **`extension`** folder, which contains `manifest.json`.
5. Pin the extension to the toolbar.

If already installed from this folder, update the source and click the extension's **Reload** button on the extensions page. Node.js and npm are only needed for development.

An extension ZIP from [Releases](https://github.com/gulzxeric/blob-image-downloader/releases), when available, can also be extracted and loaded. Select the extracted folder directly containing `manifest.json`. Check its version before installing; the current source version is 1.1.0.

## Use

1. Open the webpage and scroll to load the images you need.
2. Click the extension, then **扫描图片** (Scan images). Review the count, dimensions, and order.
3. Optionally change the filename prefix, download subfolder, or filtering settings. Scan again after changing settings.
4. Choose **按顺序下载** (Download in order) for original files, or **合并为 PDF** (Merge to PDF) for one document. Both actions rescan the page before starting.
5. Check progress in the popup. Hover over failed image rows for details. **打开下载文件夹** opens the browser's Downloads folder.

Example outputs with the default settings:

```text
Downloads/blob-images/
  20261025-153000-a12b34/   # Original-image batch
    image_001.png
    image_002.jpg
    image_003.webp
  20261025-153100-c56d78/   # PDF batch
    image.pdf
```

Each batch gets its own folder. The browser controls the main Downloads location.

Keep the source page open while images are collected. You may close the popup and reopen it to check the current session's progress. Refreshing, closing, or navigating away from the source page can stop images that have not yet been processed.

**停止提交** stops further original-image submissions; accepted browser downloads continue. **停止合并** stops image collection for a PDF and discards the unfinished document. A failed or stopped merge does not export a partial PDF; fix the cause, scan again, and retry.

## PDF behavior

- One image occupies one page. Portrait and landscape images can be mixed without cropping or stretching.
- Page sizes follow image dimensions at 96 pixels per inch, scaled down proportionally if needed to stay within the PDF page-size limit. Pixel data is not resized.
- JPEG data is embedded without recompression. Other formats must be decodable by the browser and are converted locally to PNG; transparency is retained. Animated images use their first frame.
- The PDF is generated only after every image is added successfully. The popup separately reports image processing and the final PDF download state.
- The PDF library is bundled locally. No images are uploaded and no remote scripts are loaded.

## Selection, order, and limits

Only `<img>` elements whose `src` begins with `blob:` are collected. Images must be loaded, have layout dimensions, and be visible through their ancestor chain. Loaded images outside the viewport are included. Hidden or fully transparent elements, inaccessible cross-origin frames, and opaque sandboxed frames are excluded.

Images are sorted by document Y coordinate, grouped into rows, then sorted by X coordinate within each row. Each row is anchored to its topmost image; the default row tolerance is 20 px. Repeated occurrences of the same blob URL are treated as separate images.

| Setting or limit | Value |
| --- | --- |
| Minimum natural dimensions | Both width and height strictly greater than 50 px by default; adjustable |
| Row tolerance | 20 px by default; adjustable from 0–200 px |
| Submission interval | 300 ms by default; adjustable from 100–3000 ms |
| Source image size | At most 24 MiB per image in either mode |
| PDF image dimensions | At most 40 million pixels per image |
| PDF batch size | At most 256 MiB, counting the larger of each source and converted file size |

Original downloads preserve image bytes. PNG, JPEG, WebP, GIF, AVIF, and BMP are detected by signature; other supported formats use their declared MIME type, and unknown formats use `.bin`.

The extension does not automatically scroll or wait for lazy loading, collect ordinary HTTP images or CSS backgrounds, or enter Shadow DOM. Revoked blob URLs can fail even if decoded images remain visible. Browser-internal pages and extension stores cannot be scanned. Local file webpages require **Allow access to file URLs** in the extension's settings.

Progress is stored for the current browser session. Unfinished batches are not restored after a browser restart. Browser download policies may block or interrupt saves.

## Permissions and privacy

| Permission | Purpose |
| --- | --- |
| `activeTab` | Temporarily access the webpage selected by clicking the extension |
| `scripting` | Collect and read blob images in that page and its accessible same-origin iframes |
| `downloads` | Save images or PDFs and track browser download results |
| `storage` | Store preferences locally and task metadata for the current session |
| `offscreen` | Decode images, assemble PDFs, and manage temporary download Blob URLs in a hidden extension document |

No persistent all-site access, analytics, ads, remote executable code, or developer-operated upload endpoints. Image and PDF bytes stay in browser memory during processing; extension storage contains preferences and task metadata. See [PRIVACY.md](PRIVACY.md).

## Development

Use Node.js 22 or later:

```sh
npm ci
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run package
```

`npm run package` creates **`dist/blob-image-downloader-v1.1.0.zip`**, with `manifest.json` at the ZIP root. The source can be loaded directly without building. Bundled PDF dependencies and licenses are in [extension/vendor](extension/vendor/README.md).

Browser tests use an isolated temporary profile and local fixtures. The test copy temporarily grants localhost access to simulate the toolbar's page grant; the release manifest has no such host permission. Tests may create a `blob-images-e2e` directory in the test browser's Downloads location. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use an existing compatible Chromium executable if needed.

Tests cover iframe discovery, visibility filtering, reading order, original image bytes, revoked URLs, stopping, popup closure, PDF page count and colors, JPEG preservation, WebP conversion, transparency, and mixed page proportions.

## Project files

| Path | Contents |
| --- | --- |
| `extension/` | Loadable extension source |
| `tests/` | Unit tests, browser tests, and local fixtures |
| `scripts/` | Validation, ZIP packaging, and asset generation |
| `docs/` | Popup screenshot |
| `store/` | Store listing copy, permission explanations, and review instructions |

See [CHANGELOG.md](CHANGELOG.md) for changes and [store/README.md](store/README.md) for submission materials. Report problems through [GitHub Issues](https://github.com/gulzxeric/blob-image-downloader/issues).

## License

[MIT](LICENSE) © 2026 gulzxeric. Bundled libraries retain their own license notices in `extension/vendor`.
