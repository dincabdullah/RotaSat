const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const SP = path.resolve(__dirname, '..'); /* repo root: fixtures/ (NASA POWER test data) and test-shots/ */
require('fs').mkdirSync(require('path').resolve(__dirname, '..', 'test-shots'), { recursive: true });
const PRE = { heilbronn: [49.1577, 9.109], borde: [52.0569, 11.355], gaeu: [48.8, 12.62], thrace: [41.1951, 27.1061] };
function nearest(lat, lon) { let b = null, d = 1e9; for (const [k, [a, o]] of Object.entries(PRE)) { const x = (a - lat) ** 2 + (o - lon) ** 2; if (x < d) { d = x; b = k; } } return b; }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+P9/PQAJYwN6xRQ2RQAAAABJRU5ErkJggg==', 'base64');
async function route(p) { await p.route('**/*', async r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue();
  if (u.includes('leaflet.js')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.js') });
  if (u.includes('leaflet.css')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.css'), contentType: 'text/css' });
  if (u.includes('chart.umd')) return r.fulfill({ path: path.join(__dirname, 'node_modules/chart.js/dist/chart.umd.js') });
  if (u.includes('power.larc')) { const q = new URL(u).searchParams; return r.fulfill({ path: path.join(SP, 'fixtures', `power_${nearest(+q.get('latitude'), +q.get('longitude'))}.json`) }); }
  if (u.includes('isric')) return r.fulfill({ contentType: 'application/json', body: '{"properties":{"layers":[{"name":"soc","unit_measure":{"d_factor":10},"depths":[{"values":{"mean":220}},{"values":{"mean":150}},{"values":{"mean":120}}]},{"name":"clay","unit_measure":{"d_factor":10},"depths":[{"values":{"mean":240}},{"values":{"mean":250}},{"values":{"mean":260}}]}]}}' });
  if (u.includes('nominatim') && u.includes('/search')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify([{ lat: '52.06', lon: '11.36', display_name: 'Wanzleben-Börde, Landkreis Börde, Sachsen-Anhalt' }]) });
  if (u.includes('nominatim') && u.includes('/reverse')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ address: { village: 'Leingarten', county: 'Landkreis Heilbronn' } }) });
  if (u.includes('arcgis') || u.includes('gibs')) return r.fulfill({ body: png, contentType: 'image/png' }); return r.abort(); }); }
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); await route(p);
  await p.goto('file://' + process.argv[2]); await p.waitForFunction(() => document.querySelector('#answer h2') && lastResults, null, { timeout: 120000 });
  console.log('empty list:', await p.textContent('#fTable'));
  await p.click('text=' + await p.evaluate(() => t('fl_add_cur'))); await p.waitForTimeout(500); console.log('msg:', await p.textContent('#fMsg'));
  await p.fill('#fName', 'Kuzey tarlası'); await p.fill('#fHa', '12.5'); await p.click('#fForm button[type=submit]');
  await p.fill('#fName', 'Börde arazisi'); await p.fill('#fPlace', 'Wanzleben'); await p.fill('#fHa', '30'); await p.click('#fForm button[type=submit]');
  await p.waitForFunction(() => FIELDS.length === 2 && FIELDS.every(f => FRES[f.id] && FRES[f.id].best), null, { timeout: 180000 });
  console.log('rows:\n' + (await p.$$eval('#fTable tbody tr', trs => trs.map(tr => tr.innerText.replace(/\s+/g, ' ').trim()))).join('\n'));
  console.log('total:', await p.textContent('#fTotal'));
  const dl = p.waitForEvent('download'); await p.click('#fCsv'); const d = await dl; const csvPath = path.join(SP, 'test-shots', 'fields.csv'); await d.saveAs(csvPath); console.log('csv:\n' + fs.readFileSync(csvPath, 'utf8').slice(0, 400));
  const link = await p.evaluate(() => { const data = FIELDS.map(f => [f.name, f.lat, f.lon, f.ha || 0, (f.rot || []).join('.'), f.key || '', f.place || '']); return location.href.split('#')[0] + '#fl=' + encodeURIComponent(JSON.stringify(data)) + '&lang=tr'; });
  await p.screenshot({ path: path.join(SP, 'test-shots', 'fields_en.png'), fullPage: true, clip: await p.evaluate(() => { const r = document.getElementById('fields').getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: 1440, height: Math.min(900, r.height) }; }) });
  // open the list link in a fresh browser (empty storage)
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const p2 = await ctx2.newPage(); p2.on('pageerror', e => errs.push('p2 ' + e.message)); await route(p2);
  await p2.goto(link); await p2.waitForFunction(() => FIELDS.length === 2 && FIELDS.every(f => FRES[f.id] && FRES[f.id].best), null, { timeout: 180000 });
  console.log('imported (TR, phone):', await p2.textContent('#fMsg'), '|', await p2.textContent('#fTotal'));
  console.log('phone overflow:', await p2.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1));
  await p2.screenshot({ path: path.join(SP, 'test-shots', 'fields_tr_phone.png'), fullPage: true });
  // open a field from the list
  await p.click('[data-open]'); await p.waitForFunction(() => site.key === 'heilbronn' && lastResults, null, { timeout: 60000 }); console.log('opened:', await p.evaluate(() => site.key + ' ' + userSeq().join('-')));
  console.log('ERRORS', errs); await b.close();
})();
