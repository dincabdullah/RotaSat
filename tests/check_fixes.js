// Regression checks for the full-function-test findings (run button, retry, layer error, zero priorities, share link soil, phone header).
const { chromium } = require('playwright'); const path = require('path'); const SP = path.resolve(__dirname, '..');
require('fs').mkdirSync(path.join(SP, 'test-shots'), { recursive: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+P9/PQAJYwN6xRQ2RQAAAABJRU5ErkJggg==', 'base64');
let powerDown = false, gibsDown = false;
async function route(p) { await p.route('**/*', async r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue();
  if (u.includes('leaflet.js')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.js') });
  if (u.includes('leaflet.css')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.css'), contentType: 'text/css' });
  if (u.includes('chart.umd')) return r.fulfill({ path: path.join(__dirname, 'node_modules/chart.js/dist/chart.umd.js') });
  if (u.includes('power.larc')) { if (powerDown) return r.fulfill({ status: 500, body: 'x' }); const q = new URL(u).searchParams; return r.fulfill({ path: path.join(SP, 'fixtures', +q.get('latitude') > 50 ? 'power_borde.json' : +q.get('latitude') < 45 ? 'power_thrace.json' : +q.get('longitude') > 11 ? 'power_gaeu.json' : 'power_heilbronn.json') }); }
  if (u.includes('isric')) return r.fulfill({ contentType: 'application/json', body: '{"properties":{"layers":[{"name":"soc","unit_measure":{"d_factor":10},"depths":[{"values":{"mean":220}},{"values":{"mean":137}},{"values":{"mean":121}}]},{"name":"clay","unit_measure":{"d_factor":10},"depths":[{"values":{"mean":240}},{"values":{"mean":250}},{"values":{"mean":260}}]}]}}' });
  if (u.includes('gibs')) return gibsDown ? r.fulfill({ status: 500, body: 'x' }) : r.fulfill({ body: png, contentType: 'image/png' });
  if (u.includes('arcgis')) return r.fulfill({ body: png, contentType: 'image/png' }); return r.abort(); }); }
const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', e => errs.push(e.message)); await route(p);
  await p.goto('file://' + process.argv[2]); await p.waitForFunction(() => lastResults, null, { timeout: 60000 });
  // 1 run button
  await p.evaluate(() => { window.__n = 0; const o = runAllNow; window.runAllNow = () => { window.__n++; return o(); }; });
  await p.click('#runBtn'); await p.waitForTimeout(1500); ok('run button recalculates', await p.evaluate(() => window.__n) === 1);
  // 2 retry after NASA POWER failure; old field data hidden
  powerDown = true; await p.click('[data-site="gaeu"]'); await p.waitForFunction(() => document.querySelector('#status.err'), null, { timeout: 30000 });
  ok('old field sections hidden while failed', await p.evaluate(() => document.getElementById('climate').hidden && document.getElementById('space').hidden));
  ok('error tells how to retry', /try again/.test(await p.textContent('#status')));
  powerDown = false; await p.click('#runBtn'); await p.waitForFunction(() => lastResults && site.key === 'gaeu', null, { timeout: 60000 });
  ok('retry loads the field', true, await p.evaluate(() => document.querySelector('#answer h2').textContent.slice(0, 70)));
  // 5 zero priorities
  await p.evaluate(() => { ['wInc', 'wRisk', 'wSoil', 'wWater'].forEach(i => document.getElementById(i).value = 0); runAllNow(); });
  ok('zero priorities: no recommendation headline', /at least one priority/.test(await p.textContent('#answer h2')));
  ok('zero priorities: list sorted by profit', await p.evaluate(() => { const m = lastResults.sorted.map(r => r.mean); return m.every((v, i) => !i || m[i - 1] >= v); }));
  await p.evaluate(() => { ['wInc', 'wRisk', 'wSoil', 'wWater'].forEach((i, k) => document.getElementById(i).value = [3, 3, 3, 2][k]); runAllNow(); });
  // 7 layer error note
  gibsDown = true; await p.check('#lyBox input[value="ndvi"]'); await p.waitForTimeout(2500);
  ok('NASA layer error note shows', await p.evaluate(() => document.querySelector('#lyBox p').classList.contains('err')), await p.textContent('#lyBox p'));
  gibsDown = false; await p.check('#lyBox input[value="esri"]');
  // 8 share link with soil values and raw weather
  await p.evaluate(() => { document.getElementById('soc').value = 22; document.getElementById('clay').value = 40; document.getElementById('rawHist').checked = true; runAllNow(); });
  const before = await p.evaluate(() => Math.round(lastResults.best.mean)); const hash = await p.evaluate(() => stateHash());
  const p2 = await b.newPage({ viewport: { width: 1440, height: 900 } }); p2.on('pageerror', e => errs.push('p2 ' + e.message)); await route(p2);
  await p2.goto('file://' + process.argv[2] + hash); await p2.waitForFunction(() => lastResults && document.getElementById('soilNote').dataset.k === 'soil_link', null, { timeout: 60000 });
  await p2.waitForTimeout(800); const after = await p2.evaluate(() => Math.round(lastResults.best.mean));
  ok('share link keeps soil and raw weather', before === after, `${before} vs ${after}`);
  // 6 details right under the result card
  ok('details section follows the plan section', await p.evaluate(() => document.getElementById('plan').nextElementSibling.id === 'details'));
  // 3 Thrace tag and wheat-sunflower preset
  ok('Thrace tagged dry summers', /dry summers/.test(await p.textContent('[data-site="thrace"]')));
  ok('wheat-sunflower preset', await p.evaluate(() => PRESETS.some(x => x.seq.join() === 'wheat,sunflower')));
  // 2 phone header
  for (const w of [390, 320]) { const ph = await b.newPage({ viewport: { width: w, height: 844 } }); await route(ph);
    await ph.addInitScript(() => { try { localStorage.setItem('rotasat_lang', 'tr'); } catch (e) {} });
    await ph.goto('file://' + process.argv[2]); await ph.waitForTimeout(1500);
    const r = await ph.evaluate(() => { const h = document.querySelector('header').getBoundingClientRect(), ro = document.querySelector('.readout').getBoundingClientRect(), h1 = document.querySelector('.panel h1').getBoundingClientRect();
      return { header: Math.round(h.height), sticky: getComputedStyle(document.querySelector('header')).position, overlap: !(ro.bottom <= h1.top || ro.top >= h1.bottom), over: document.documentElement.scrollWidth > innerWidth + 1 }; });
    ok(`phone ${w}px: header small and not sticky, readout clear of title, no overflow`, r.header < 130 && r.sticky === 'static' && !r.overlap && !r.over, JSON.stringify(r));
    await ph.screenshot({ path: path.join(SP, 'test-shots', `phone_top_${w}.png`) }); await ph.close(); }
  console.log('ERRORS', errs); await b.close();
})();
