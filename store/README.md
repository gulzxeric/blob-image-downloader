# Browser store submission materials

Version **1.1.0** · Publisher **gulzxeric** · License **MIT**

This directory contains listing copy, permission explanations, review instructions, and graphics for Blob Image Downloader's original-image downloads and PDF merging. Store submission and publication are managed separately in the publisher's developer accounts.

## Materials

| File | Purpose |
| --- | --- |
| `dist/blob-image-downloader-v1.1.0.zip` (generated from the repository root) | Extension package, with `manifest.json` at the ZIP root |
| [listing.en.md](listing.en.md) | English listing copy |
| [listing.zh-CN.md](listing.zh-CN.md) | Chinese listing copy matching the popup |
| [privacy-and-permissions.md](privacy-and-permissions.md) | Single purpose, five permission explanations, and data handling |
| [reviewer-notes.md](reviewer-notes.md) | Local image fixture and checks for both output modes |
| [screenshot-1280x800.png](assets/screenshot-1280x800.png) | Screenshot graphic |
| [promo-440x280.png](assets/promo-440x280.png) | Promotional tile |
| [128 × 128 icon](../extension/icons/icon128.png) | Extension icon |
| [Privacy policy](../PRIVACY.md) | Public privacy statement |

The manifest name remains **Blob 图片顺序下载** and the popup language is Simplified Chinese. The 1.1.0 listing describes the added **合并为 PDF** action.

## Prepare a package

From the repository root:

```sh
npm ci
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run package
```

Upload the generated extension ZIP, which includes the local PDF library and third-party license notices. The release manifest uses `activeTab`, `scripting`, `downloads`, `storage`, and `offscreen`; the localhost host grant is confined to the browser-test copy.

Follow the current dashboard instructions for the [Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/) or [Microsoft Edge Add-ons](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension). Review listing details, permission declarations, account requirements, and graphics before submitting.

## Public links

- [Homepage](https://github.com/gulzxeric/blob-image-downloader)
- [Support](https://github.com/gulzxeric/blob-image-downloader/issues)
- [Privacy policy](https://github.com/gulzxeric/blob-image-downloader/blob/main/PRIVACY.md)
- [Release downloads](https://github.com/gulzxeric/blob-image-downloader/releases)

## Graphics

`docs/popup.png` is a real popup capture from the local browser fixture. After updating that image or the presentation in `store/preview.html`, regenerate graphics with:

```sh
npm run store:assets
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if using an existing compatible Chromium. Demo images are generated locally, without user browsing content.
