import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ['storage']);
assert.equal(manifest.chrome_url_overrides.newtab, 'index.html');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const referenced = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(match => match[1]).filter(ref => !ref.startsWith('http'));
for (const ref of referenced) assert.equal(fs.existsSync(path.join(root, ref)), true, `Missing referenced file: ${ref}`);
for (const icon of Object.values(manifest.icons)) assert.equal(fs.existsSync(path.join(root, icon)), true, `Missing icon: ${icon}`);
const appSource = fs.readFileSync(path.join(root, 'src/js/app.js'), 'utf8');
const ids = [...appSource.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
for (const id of new Set(ids)) assert.match(html, new RegExp(`id=["']${id}["']`), `Missing DOM id: ${id}`);
const mainMarkup = html.match(/<main[\s\S]*?<\/main>/)?.[0] || '';
assert.match(mainMarkup, /id="countdown"/);
for (const removed of ['TIME REMAINING', 'deadlineTitle', 'targetMeta', 'configureButton', 'motivational-copy', 'currentTime', 'signature']) assert.doesNotMatch(mainMarkup, new RegExp(removed), `Removed main-page element remains: ${removed}`);
assert.doesNotMatch(appSource, /setInterval\(/, 'Unnecessary interval remains in the page controller');
assert.match(appSource, /visibilitychange/);
for (const file of ['src/js/countdown.js', 'src/js/database.js', 'src/js/date-utils.js', 'src/js/settings.js', 'src/js/storage.js', 'src/js/ui.js', 'src/js/wallpaper.js']) {
  const result = await import(path.join(root, file));
  assert.ok(result, `Could not import ${file}`);
}
console.log(`static-check: manifest, ${referenced.length} local HTML references, icons, ${new Set(ids).size} DOM ids, minimal main markup, and module imports passed`);
