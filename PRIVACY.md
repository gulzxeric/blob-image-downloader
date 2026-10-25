# Privacy Policy — Blob Image Downloader & PDF Merger

Effective date: October 25, 2026. Applies to extension version 1.1.0.

Blob Image Downloader is maintained by **gulzxeric**. It saves loaded, visible blob images from the webpage selected by the user as ordered original files or as one locally generated PDF.

## Information processed on your device

After you click the extension and scan a page, it reads image elements in the page and accessible same-origin iframes, blob URLs, natural dimensions, layout coordinates, and visibility styles. Cross-origin and opaque sandboxed frames are skipped. The page title is shown in the popup to identify the selected page.

When you start a download, it reads the selected blob image bytes and passes them to your browser's download manager. Images are not sent to the developer or a developer-operated server.

When you select Merge to PDF, a hidden extension document decodes the images and combines them locally using the bundled PDF library. Image/PDF bytes remain in memory until the task fails, is stopped, or its PDF download completes or fails; they are not stored in extension storage or uploaded. The offscreen permission supports this hidden document and its temporary download Blob URL. PDF filenames, download identifiers, and processing states are stored as session task metadata. Stopping a merge before submission discards the unfinished PDF.

Local extension storage retains your filename prefix, subfolder name, minimum image size, row tolerance, and submission interval. Session storage holds task identifiers, tab identifiers, image dimensions and coordinates, generated relative filenames, browser download identifiers, completion states, and error messages. It does not persist image bytes or blob URLs. Blob URLs and image bytes are held in memory while the current task runs.

The extension searches browser download records by the identifiers returned for its own tasks and listens to download state changes to update progress. It does not scan your browsing history or unrelated downloaded file contents. Your browser records downloads in its normal download history.

## Collection, sharing, and remote code

The developer does not collect, receive, sell, transfer, or share personal information, page contents, downloaded images, or usage analytics through this extension. There are no ads, tracking SDKs, developer-operated network services, or remotely loaded executable scripts. The extension does not request persistent access to all websites.

All image handling is local to your browser. External support or repository websites have their own privacy practices; the extension does not use them for image processing.

## Retention and your controls

Preferences remain locally until you change them, clear the extension's data, or uninstall it. Progress metadata remains for the browser session and is cleared when the browser session ends or the extension is reloaded or removed. Stopping an original-image batch prevents further image submissions; files already submitted continue through the browser's download manager. Stopping PDF collection discards its unfinished document. Closing the popup alone does not stop either task.

Downloaded files and browser download history remain under your control and are not removed when you uninstall the extension. Use your browser and operating system to manage them.

## Updates and contact

Policy changes will be recorded in this repository and reflected in the effective date. For privacy questions, use the [project's issue tracker](https://github.com/gulzxeric/blob-image-downloader/issues). Do not post passwords, private images, or other sensitive data in public issues.
