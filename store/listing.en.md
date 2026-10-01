# English store listing

## Name

The package name is **Blob 图片顺序下载** (Blob Image Downloader). The manifest uses the Chinese name; do not enter a different package name for a localized listing.

## Short description

Download loaded blob images in page order, with numbered filenames and their original formats.

## Full description

Save loaded, visible blob images from the current webpage in reading order: top to bottom, and left to right within each row.

Blob Image Downloader helps collect images a webpage displays through temporary blob URLs. Click the extension, scan the page, review the image order, and start a batch download. Each batch gets a separate subfolder in your browser's Downloads directory.

Features:

- Preview the image count, dimensions, and download order.
- Number files sequentially: image_001.png, image_002.jpg, and so on.
- Preserve original image bytes and formats; no conversion to PNG.
- Choose a filename prefix, subfolder, minimum size, row tolerance, and submission interval.
- See actual completed, failed, in-progress, and unsubmitted counts.
- Close the popup while downloads continue; reopen it to check progress.
- Stop submitting additional images while already accepted downloads continue.

Privacy:

The extension runs on the selected page after you click it. It does not request blanket access to all sites. There are no analytics, ads, remote scripts, or uploads to the developer. Preferences and progress are stored locally.

Scope and limits:

Only loaded, visible image elements with blob URLs in the main page and same-origin iframes are supported. The extension does not automatically scroll or access cross-origin or opaque sandboxed iframes and does not download ordinary HTTP images, CSS backgrounds, or videos. Each image must be no larger than 24 MiB. Revoked URLs and browser restrictions can produce failures.

The current popup interface is in Simplified Chinese. “扫描图片” means Scan images, “按顺序下载” means Download in order, and “停止提交” means Stop submitting.

Free and open source under the MIT license. Source code, English and Chinese instructions, and support are available in the linked GitHub repository.

## Listing choices

- Primary UI language: Simplified Chinese.
- Price: free; no purchases or subscriptions.
- Category: an appropriate productivity/utility category available in the dashboard.
- Support: https://github.com/gulzxeric/blob-image-downloader/issues
- Homepage: https://github.com/gulzxeric/blob-image-downloader
- Privacy: https://github.com/gulzxeric/blob-image-downloader/blob/main/PRIVACY.md
