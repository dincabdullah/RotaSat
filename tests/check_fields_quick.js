// Quick model check: results for each preset field (today, real NASA POWER fixture), plus run time.
require('fs').mkdirSync(require('path').resolve(__dirname, '..', 'test-shots'), { recursive: true });
const { chromium } = require('playwright'); const path = require('path'); const SP = path.resolve(__dirname, '..'); /* repo root: fixtures/ (NASA POWER test data) and test-shots/ */
const PRE = { heilbronn: [49.1577, 9.109], borde: [52.0569, 11.355], gaeu: [48.8, 12.62], thrace: [41.1951, 27.1061] };
function nearest(lat, lon) { let b = null, d = 1e9; for (const [k, [a, o]] of Object.entries(PRE)) { const x = (a - lat) ** 2 + (o - lon) ** 2; if (x < d) { d = x; b = k; } } return b; }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+P9/PQAJYwN6xRQ2RQAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.route('**/*', async r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue();
    if (u.includes('leaflet.js')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.js') });
    if (u.includes('leaflet.css')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.css'), contentType: 'text/css' });
    if (u.includes('chart.umd')) return r.fulfill({ path: path.join(__dirname, 'node_modules/chart.js/dist/chart.umd.js') });
    if (u.includes('power.larc')) { const q = new URL(u).searchParams; return r.fulfill({ path: path.join(SP, 'fixtures', `power_${nearest(+q.get('latitude'), +q.get('longitude'))}.json`) }); }
    if (u.includes('isric')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ properties: { layers: [{ name: 'soc', unit_measure: { d_factor: 10 }, depths: [{ values: { mean: 220 } }, { values: { mean: 150 } }, { values: { mean: 120 } }] }, { name: 'clay', unit_measure: { d_factor: 10 }, depths: [{ values: { mean: 240 } }, { values: { mean: 250 } }, { values: { mean: 260 } }] }] } }) });
    if (u.includes('arcgis') || u.includes('gibs')) return r.fulfill({ body: png, contentType: 'image/png' }); return r.abort(); });
  await p.goto('file://' + process.argv[2]);
  for (const k of (process.argv[3] || 'heilbronn,borde,gaeu,thrace').split(',')) {
    await p.click(`[data-site="${k}"]`).catch(() => {}); await p.waitForFunction(k2 => document.querySelector('#answer h2') && lastResults && site.key === k2, k, { timeout: 120000 });
    await p.waitForTimeout(300);
    if (process.argv[4]) await p.evaluate(v => { document.getElementById("irr").value = v; }, process.argv[4]);
    const r = await p.evaluate(() => { const t0 = performance.now(); runAllNow(); const ms = performance.now() - t0;
      return { ms: Math.round(ms), rows: lastResults.sorted.slice(0,12).map(r => `${r.seq.join('-')}: €${Math.round(r.mean)} bad €${Math.round(r.p10)} fail ${(r.fail * 100).toFixed(0)}% dC ${r.dC.toFixed(1)} bare ${r.bare.toFixed(1)} N ${Math.round(r.nSur)}` + (r.water != null ? ` water ${Math.round(r.water)}mm` : '') + (r.irr != null ? ` irr ${Math.round(r.irr)}` : '')) }; });
    console.log(`== ${k} (${r.ms} ms)\n` + r.rows.join('\n'));
  }
  console.log('ERRORS', errs.length, errs.slice(0, 5)); await b.close();
})();
