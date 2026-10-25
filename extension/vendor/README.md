# Bundled PDF library

`pdf-lib.min.js` is the unmodified UMD browser distribution of [pdf-lib 1.17.1](https://github.com/Hopding/pdf-lib/tree/v1.17.1), licensed under MIT (see `pdf-lib.LICENSE.md`). Its bundled dependencies' notices are in `upng.LICENSE`, `standard-fonts.LICENSE.md`, and `pako.LICENSE`. It is loaded locally in the offscreen document; the extension never downloads executable code at runtime.

After changing the exact `pdf-lib` development dependency and running `npm install`, refresh the checked-in files with PowerShell:

```powershell
Copy-Item node_modules/pdf-lib/dist/pdf-lib.min.js extension/vendor/pdf-lib.min.js
Copy-Item node_modules/pdf-lib/LICENSE.md extension/vendor/pdf-lib.LICENSE.md
Copy-Item node_modules/@pdf-lib/upng/LICENSE extension/vendor/upng.LICENSE
Copy-Item node_modules/@pdf-lib/standard-fonts/LICENSE.md extension/vendor/standard-fonts.LICENSE.md
Copy-Item node_modules/pako/LICENSE extension/vendor/pako.LICENSE
```

Run `npm run check`, `npm test`, and `npm run test:e2e` before packaging.
