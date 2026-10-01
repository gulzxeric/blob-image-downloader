# Browser store submission materials

Version: **1.0.1**. Publisher: **gulzxeric**. License: **MIT**.

**Status: prepared; not submitted.** The publisher has not yet registered a Chrome Web Store or Microsoft Edge developer account. Browser UI control was also denied during preparation. No dashboard draft or review submission was created. Account enrollment and any required developer agreement must be completed by the publisher.

## Files to use

| File | Purpose |
| --- | --- |
| [Release ZIP](https://github.com/gulzxeric/blob-image-downloader/releases/latest) | Download `blob-image-downloader-v1.0.1.zip`; upload without extracting |
| [listing.en.md](listing.en.md) | English listing copy |
| [listing.zh-CN.md](listing.zh-CN.md) | Chinese copy matching the popup language |
| [privacy-and-permissions.md](privacy-and-permissions.md) | Single purpose, permission justifications, and privacy declarations |
| [reviewer-notes.md](reviewer-notes.md) | Self-contained review instructions |
| [screenshot-1280x800.png](assets/screenshot-1280x800.png) | Screenshot-sized graphic featuring the actual popup capture |
| [promo-440x280.png](assets/promo-440x280.png) | Small promotional tile |
| [128 × 128 icon](../extension/icons/icon128.png) | Store icon |
| [Privacy policy](../PRIVACY.md) | Public privacy statement |

Public privacy URL: `https://github.com/gulzxeric/blob-image-downloader/blob/main/PRIVACY.md`

Support URL: `https://github.com/gulzxeric/blob-image-downloader/issues`

Homepage URL: `https://github.com/gulzxeric/blob-image-downloader`

The English listing states that the current popup UI is Simplified Chinese. Do not claim English UI support or add store installation links before approval and publication.

## Chrome Web Store

1. Register or sign in at the [developer dashboard](https://chrome.google.com/webstore/devconsole). Chrome requires a one-time developer registration fee. The publisher must complete verification, truthful account information, and the developer agreement.
2. Select **Add new item** and upload the release ZIP. Do not upload the source repository ZIP or the localhost-permission test copy.
3. Fill in the listing with the supplied copy and graphics. Choose a suitable utility/productivity category offered by the dashboard and Simplified Chinese as the primary language.
4. Complete privacy and permission fields using the supplied explanations. Review the exact current declaration labels before certifying them.
5. Add the reviewer instructions. Testing the extension requires no account or paid service.
6. Choose free, public distribution; submit for review with automatic publication after approval if desired.

## Microsoft Edge Add-ons

1. Register in the [Microsoft Edge developer program](https://partner.microsoft.com/dashboard/microsoftedge/overview) with an eligible Microsoft account. Registration has no program fee. The publisher must supply truthful account details and complete agreements and verification.
2. Create an extension and upload the same release ZIP.
3. Complete availability, properties, listing, privacy information, and certification notes using these materials. Obtain any required publisher contact details from the verified account, not inferred repository data.
4. Choose free, public distribution and submit for certification. Preparation alone is not submission; verify the dashboard's submitted or published state.

## Regenerate graphics

```sh
npm ci
npx playwright install chromium
npm run store:assets
```

The screenshot graphic includes the real popup capture from the project's browser test. The demo images are locally generated; no user's browsing content or third-party branded images are used.

Sources checked October 1, 2026: [Chrome publishing](https://developer.chrome.com/docs/webstore/publish/), [Chrome listing assets](https://developer.chrome.com/docs/webstore/cws-dashboard-listing/), [Chrome registration](https://developer.chrome.com/docs/webstore/register/), [Chrome privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/), [Edge registration](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/create-dev-account), and [Edge publishing](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension).
