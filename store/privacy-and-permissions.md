# Privacy and permission declarations

These statements describe version 1.0.1. Match them to the current dashboard's field labels; no declaration has been submitted yet.

## Single purpose

Save the user's selected webpage's loaded, visible blob images as numbered local files in visual reading order, preserving original bytes and formats.

## Permission justifications

| Permission | Review form text |
| --- | --- |
| `activeTab` | Temporarily accesses the webpage selected by clicking the toolbar button to inspect its main-frame image elements. No persistent all-site access. |
| `scripting` | Injects the packaged isolated-world collector to filter and order blob images and read their local blob data after the user requests a download. No remote executable code is injected. |
| `downloads` | Saves the selected original data with sequential relative filenames and tracks completion or interruption. Searches use identifiers returned for the extension's own tasks. Opens Downloads when requested. |
| `storage` | Stores preferences locally and task metadata in session storage, so reopening the popup restores progress and reconciles results. Image bytes and blob URLs are not persisted in these stores. |

## Remote code

No. All JavaScript is packaged. No remote executable scripts, evaluated strings, remote WebAssembly modules, or developer backend dependencies are used.

## Data use

Locally processes page image elements, layout, dimensions, blob URLs, the page title for display, image bytes, generated filenames, download identifiers, and task statuses solely for the requested save.

No user data is transmitted to the developer or external recipients. No analytics, ads, data sales, or unrelated tracking. Download history and saved files remain managed by the browser and operating system.

Declare **Website content** for the selected image data and related page content processed locally. If the current form's **Web history / browsing activity** category includes active-tab titles and resource URLs, disclose that limited handling too: only the user-selected page and its blob resources, with no access to the browser's full history. Do not select a blanket "no user data" answer simply because processing is local. Google explicitly requires disclosure for local-only processing in its [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq). Match the current form's definitions to these facts before certifying.

For Edge's personal-information question, selected images or filenames may contain personal information but are processed only locally. If the current form treats local access as personal-information access, declare that access and provide the privacy URL; “no upload” is not “no local access.”

No user data is sold or transferred for unrelated purposes, used for lending/credit decisions, or used outside the described single purpose.

Privacy URL: https://github.com/gulzxeric/blob-image-downloader/blob/main/PRIVACY.md
