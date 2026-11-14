const { chromium } = require('playwright'); const path = require('path'); const SP = path.resolve(__dirname, '..'); /* repo root: fixtures/ (NASA POWER test data) and test-shots/ */
require('fs').mkdirSync(require('path').resolve(__dirname, '..', 'test-shots'), { recursive: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+P9/PQAJYwN6xRQ2RQAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', async r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue();
    if (u.includes('leaflet.js')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.js') });
    if (u.includes('leaflet.css')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.css'), contentType: 'text/css' });
    if (u.includes('chart.umd')) return r.fulfill({ path: path.join(__dirname, 'node_modules/chart.js/dist/chart.umd.js') });
    if (u.includes('power.larc')) return r.fulfill({ path: path.join(SP, 'fixtures', 'power_heilbronn.json') });
    if (u.includes('isric')) return r.fulfill({ contentType: 'application/json', body: '{"properties":{"layers":[{"name":"soc","unit_measure":{"d_factor":10},"depths":[{"values":{"mean":220}},{"values":{"mean":150}},{"values":{"mean":120}}]},{"name":"clay","unit_measure":{"d_factor":10},"depths":[{"values":{"mean":240}},{"values":{"mean":250}},{"values":{"mean":260}}]}]}}' });
    if (u.includes('nominatim')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify([{ lat: '49.142', lon: '9.122', display_name: 'Leingarten, Landkreis Heilbronn, Baden-Württemberg, Deutschland' }]) });
    if (u.includes('arcgis') || u.includes('gibs')) return r.fulfill({ body: png, contentType: 'image/png' }); return r.abort(); });
  await p.goto('file://' + process.argv[2]); await p.waitForFunction(() => document.querySelector('#answer h2') && lastResults, null, { timeout: 120000 });
  // search
  await p.fill('#srchQ', 'Leingarten'); await p.click('#srchF button[type=submit]'); await p.waitForSelector('#srchR li button');
  console.log('search result:', await p.textContent('#srchR li button')); await p.click('#srchR li button'); await p.waitForTimeout(300);
  console.log('map centre after search:', await p.evaluate(() => { const c = heroMap.getCenter(); return c.lat.toFixed(3) + ',' + c.lng.toFixed(3) + ' z' + heroMap.getZoom(); }));
  // click on the map (right half, not under the panel) -> confirm popup -> choose
  const box = await p.locator('#heroMap').boundingBox(); await p.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.6);
  await p.evaluate(() => { const o = chooseSite; window.__calls = []; chooseSite = s => { window.__calls.push(JSON.stringify(s)); return o(s); }; }); await p.waitForSelector('#pickBtn'); console.log('popup:', (await p.textContent('.pick')).replace(/\s+/g, ' '), '| site before:', await p.evaluate(() => site.key));
  await p.click('#pickBtn'); await p.waitForTimeout(1500); console.log('debug after pick:', await p.evaluate(() => [site.key, !!lastResults, busy, document.getElementById('status')?.textContent, !!document.getElementById('pickBtn')].join(' | ')), errs); await p.waitForFunction(() => site.key === 'custom' && lastResults, null, { timeout: 20000 });
  console.log('site after pick:', await p.evaluate(() => site.key + ' ' + site.lat + ',' + site.lon + ' calls=' + window.__calls.join(';')), '|', await p.textContent('#fieldName'));
  await p.click('#backBtn'); await p.click('#zIn'); console.log('zoom after back+in:', await p.evaluate(() => heroMap.getZoom()));
  await p.mouse.move(box.x + box.width * 0.75, box.y + 200); await p.mouse.wheel(0, 200); await p.waitForTimeout(200);
  console.log('wheel hint on:', await p.evaluate(() => document.querySelector('.wheelhint').classList.contains('on') + ' "' + document.querySelector('.wheelhint').textContent + '"'));
  await p.click('#pHide'); console.log('panel hidden:', await p.evaluate(() => document.getElementById('top').classList.contains('nopanel')));
  await p.screenshot({ path: path.join(SP, 'test-shots', 'map_nopanel.png') }); await p.click('#pShow');
  await p.screenshot({ path: path.join(SP, 'test-shots', 'map.png') });
  console.log('ERRORS', errs); await b.close();
})();
