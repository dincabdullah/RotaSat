// Static checks of v2/index.html without a browser: the script parses, EN/TR/DE have the same keys (and the same
// number of terms, glossary and data-table rows), every {placeholder} of an English text exists in TR and DE,
// every data-i18n key and every t('key') literal exists, and no em dash is left in the page or its texts.
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const js = html.slice(html.indexOf('<script>\nconst SELF_SRC') + 8, html.lastIndexOf('</script>'));
let bad = 0; const fail = m => { bad++; console.log('FAIL', m); };
try { new vm.Script(js); } catch (e) { fail('script does not parse: ' + e.message); }
const a = js.indexOf('const I18N={'), b = js.indexOf('const SITES=');
const I18N = vm.runInNewContext(js.slice(a, b) + ';I18N');
const langs = Object.keys(I18N); console.log('languages', langs.join(', '), '| keys', langs.map(l => Object.keys(I18N[l]).length).join(', '));
const en = I18N.en;
for (const l of ['tr', 'de']) {
  for (const k of Object.keys(en)) if (!(k in I18N[l])) fail(`${l} misses ${k}`);
  for (const k of Object.keys(I18N[l])) if (!(k in en)) fail(`${l} has extra ${k}`);
  for (const k of Object.keys(en)) { const x = en[k], y = I18N[l][k]; if (y == null) continue;
    if (Array.isArray(x)) { if (!Array.isArray(y) || y.length !== x.length) fail(`${l}.${k}: list length differs`); continue; }
    const ph = s => (s.match(/\{[a-z0-9]+\}/gi) || []).sort().join(); if (ph(x) !== ph(y)) fail(`${l}.${k}: placeholders ${ph(y)} vs en ${ph(x)}`);
    if (!y.trim()) fail(`${l}.${k} is empty`); }
}
for (const l of langs) { const s = JSON.stringify(I18N[l]); if (s.includes('—')) fail(`${l}: em dash in a text`); }
if (html.replace(/const (CM6|S2)=.*\n/g, '').includes('—')) fail('em dash somewhere in the page');
const used = new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]).concat([...js.matchAll(/\bt\('([a-zA-Z0-9_]+)'[,)]/g)].map(m => m[1])));
for (const k of used) if (!(k in en)) fail(`key used but not defined: ${k}`);
console.log('keys used in the page:', used.size, '| failures:', bad);
process.exit(bad ? 1 : 0);
