const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const extension = path.join(root, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('Manifest V3 required');
if (manifest.host_permissions || manifest.content_scripts) throw new Error('Use user-initiated activeTab access only');
const references = [manifest.action.default_popup, manifest.background.service_worker, 'offscreen.html', 'offscreen.js', 'vendor/pdf-lib.min.js', 'vendor/pdf-lib.LICENSE.md', ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)];
for (const reference of references) if (!fs.existsSync(path.join(extension, reference))) throw new Error(`Missing ${reference}`);
for (const name of fs.readdirSync(extension).filter(name => name.endsWith('.js'))) execFileSync(process.execPath, ['--check', path.join(extension, name)], { stdio: 'inherit' });
for (const name of [manifest.action.default_popup, 'offscreen.html']) {
  const html = fs.readFileSync(path.join(extension, name), 'utf8');
  if (/\son\w+\s*=|<script(?![^>]*\bsrc=)/i.test(html)) throw new Error('Inline scripts conflict with extension CSP');
  for (const [, src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    if (!fs.existsSync(path.join(extension, src))) throw new Error(`Missing local script ${src}`);
  }
}
console.log('Manifest, asset references, CSP and JavaScript syntax passed.');
