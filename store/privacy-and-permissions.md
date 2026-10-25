# Privacy and permission declarations

These statements describe version 1.1.0. Match them to the current store dashboard's field labels when preparing a submission.

## Single purpose

Save the selected webpage's loaded, visible blob images in reading order as numbered original files or as one locally generated PDF.

## Permission justifications

| Permission | Review form text |
| --- | --- |
| `activeTab` | Temporarily accesses the webpage selected by clicking the toolbar button to inspect image elements in the main page and accessible same-origin iframes. No persistent all-site access. |
| `scripting` | Injects the packaged isolated-world collector to filter and order blob images and read their local blob data after the user requests a download. No remote executable code is injected. |
| `downloads` | Saves numbered original image files or one PDF per batch and tracks completion or interruption. Searches use identifiers returned for the extension's own tasks. Opens Downloads when requested. |
| `storage` | Stores preferences locally and task metadata in session storage, so reopening the popup restores progress and reconciles results. Image bytes and blob URLs are not persisted in these stores. |
| `offscreen` | Runs a packaged hidden extension document to decode images, assemble a PDF using the bundled library, and manage temporary download Blob URLs. This lets processing continue after the popup closes. Image and PDF bytes remain in memory and are released when the task ends. |

## Remote code

No. All JavaScript is packaged. No remote executable scripts, evaluated strings, remote WebAssembly modules, or developer backend dependencies are used.

## Data use

Locally processes page image elements, layout, dimensions, blob URLs, the page title for display, image bytes, generated PDF data, generated filenames, download identifiers, and task statuses solely for the requested save.

No user data is transmitted to the developer or external recipients. No analytics, ads, data sales, or unrelated tracking. Download history and saved files remain managed by the browser and operating system.

The extension handles selected image content, active-tab titles, and blob resource URLs locally. Use the dashboard's current definitions to disclose this handling, including **Website content** and any applicable browsing-activity category. It does not read the browser's full history. Consult the official [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) when preparing declarations.

For Edge's personal-information question, selected images or filenames may contain personal information but are processed only locally. If the current form treats local access as personal-information access, declare that access and provide the privacy URL; “no upload” is not “no local access.”

No user data is sold or transferred for unrelated purposes, used for lending/credit decisions, or used outside the described single purpose.

Privacy URL: https://github.com/gulzxeric/blob-image-downloader/blob/main/PRIVACY.md
