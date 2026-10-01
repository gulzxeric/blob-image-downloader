# Privacy Policy — Blob Image Downloader

Effective date: October 1, 2026. Applies to extension version 1.0.2.

Blob Image Downloader is maintained by **gulzxeric**. Its purpose is to save loaded, visible blob images from the webpage selected by the user, in visual reading order.

## Information processed on your device

After you click the extension and scan a page, it reads image elements in the page and accessible same-origin iframes, blob URLs, natural dimensions, layout coordinates, and visibility styles. Cross-origin and opaque sandboxed frames are skipped. The page title is shown in the popup to identify the selected page.

When you start a download, it reads the selected blob image bytes and passes them to your browser's download manager. Images are not sent to the developer or a developer-operated server.

Local extension storage retains your filename prefix, subfolder name, minimum image size, row tolerance, and submission interval. Session storage holds task identifiers, tab identifiers, image dimensions and coordinates, generated relative filenames, browser download identifiers, completion states, and error messages. It does not persist image bytes or blob URLs. Blob URLs and image bytes are held in memory while the current task runs.

The extension searches browser download records by the identifiers returned for its own tasks and listens to download state changes to update progress. It does not scan your browsing history or unrelated downloaded file contents. Your browser records downloads in its normal download history.

## Collection, sharing, and remote code

The developer does not collect, receive, sell, transfer, or share personal information, page contents, downloaded images, or usage analytics through this extension. There are no ads, tracking SDKs, developer-operated network services, or remotely loaded executable scripts. The extension does not request persistent access to all websites.

All image handling is local to your browser. External support or repository websites have their own privacy practices; the extension does not use them for image processing.

## Retention and your controls

Preferences remain locally until you change them, clear the extension's data, or uninstall it. Progress metadata remains for the browser session and is cleared when the browser session ends or the extension is reloaded or removed. Stopping a task prevents further image submissions; files already submitted continue through the browser's download manager.

Downloaded files and browser download history remain under your control and are not removed when you uninstall the extension. Use your browser and operating system to manage them.

## Updates and contact

Policy changes will be recorded in this repository and reflected in the effective date. For privacy questions, use the [project's issue tracker](https://github.com/gulzxeric/blob-image-downloader/issues). Do not post passwords, private images, or other sensitive data in public issues.
