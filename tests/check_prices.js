const { chromium } = require('playwright'); const path = require('path'); const SP = path.resolve(__dirname, '..'); /* repo root: fixtures/ (NASA POWER test data) and test-shots/ */
require('fs').mkdirSync(require('path').resolve(__dirname, '..', 'test-shots'), { recursive: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+P9/PQAJYwN6xRQ2RQAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', async r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue();
    if (u.includes('leaflet.js')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.js') });
    if (u.includes('chart.umd')) return r.fulfill({ path: path.join(__dirname, 'node_modules/chart.js/dist/chart.umd.js') });
    if (u.includes('power.larc')) return r.fulfill({ path: path.join(SP, 'fixtures', 'power_heilbronn.json') });
    if (u.includes('isric')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ properties: { layers: [{ name: 'soc', unit_measure: { d_factor: 10 }, depths: [{ values: { mean: 220 } }, { values: { mean: 150 } }, { values: { mean: 120 } }] }, { name: 'clay', unit_measure: { d_factor: 10 }, depths: [{ values: { mean: 240 } }, { values: { mean: 250 } }, { values: { mean: 260 } }] }] } }) });
    if (u.includes('arcgis') || u.includes('gibs')) return r.fulfill({ body: png, contentType: 'image/png' }); return r.abort(); });
  await p.goto('file://' + process.argv[2]); await p.waitForFunction(() => document.querySelector('#answer h2') && lastResults, null, { timeout: 120000 });
  for (const m of ['fixed', 'hist', 'y2022', 'y2026']) {
    await p.selectOption('#priceMode', m); await p.waitForTimeout(200);
    const r = await p.evaluate(() => { runAllNow(); return { note: document.getElementById('priceNote').textContent, head: document.querySelector('#answer .mono').textContent,
      rows: lastResults.sorted.slice(0, 10).map(r => `${r.seq.join('-')}: €${Math.round(r.mean)} bad €${Math.round(r.p10)} fert ${Math.round(r.fert)}`) }; });
    console.log(`== ${m}\n${r.note}\n${r.head}\n` + r.rows.join('\n'));
  }
  console.log('ERRORS', errs); await b.close();
})();
