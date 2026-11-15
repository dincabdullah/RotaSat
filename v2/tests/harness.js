// Shared helper for the v2 browser tests: headless Chromium (Playwright) with every external service answered locally,
// so the tests run offline and give the same result each time.
// Paths can be set from outside, because node_modules and the NASA POWER fixtures are not committed:
//   ROTASAT_NODE_MODULES (default ../../tests/node_modules), ROTASAT_FIXTURES (default ../../fixtures)
const fs = require('fs'); const path = require('path');
const NM = process.env.ROTASAT_NODE_MODULES || path.resolve(__dirname, '..', '..', 'tests', 'node_modules');
const FX = process.env.ROTASAT_FIXTURES || path.resolve(__dirname, '..', '..', 'fixtures');
let chromium = null;   // Playwright: next to Leaflet and Chart.js, or installed globally (NODE_PATH or ROTASAT_PLAYWRIGHT)
for (const m of [process.env.ROTASAT_PLAYWRIGHT, path.join(NM, 'playwright'), 'playwright', '/opt/node22/lib/node_modules/playwright'].filter(Boolean)) { try { ({ chromium } = require(m)); break; } catch (e) {} }
if (!chromium) throw new Error('Playwright not found. Install it in tests/node_modules or set ROTASAT_PLAYWRIGHT.');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
const REGION = 'file://' + path.resolve(__dirname, '..', 'region.html');
const OUT = process.env.ROTASAT_SHOTS || path.resolve(__dirname, '..', '..', 'test-shots', 'v2');
fs.mkdirSync(OUT, { recursive: true });
const PRE = { heilbronn: [49.1577, 9.109], borde: [52.0569, 11.355], gaeu: [48.8, 12.62], thrace: [41.1951, 27.1061] };
function nearest(lat, lon) { let b = null, d = 1e9; for (const [k, [a, o]] of Object.entries(PRE)) { const x = (a - lat) ** 2 + (o - lon) ** 2; if (x < d) { d = x; b = k; } } return b; }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+P9/PQAJYwN6xRQ2RQAAAABJRU5ErkJggg==', 'base64');
const SOIL = JSON.stringify({ properties: { layers: [
  { name: 'soc', unit_measure: { d_factor: 10 }, depths: [{ values: { mean: 220 } }, { values: { mean: 150 } }, { values: { mean: 120 } }] },
  { name: 'clay', unit_measure: { d_factor: 10 }, depths: [{ values: { mean: 240 } }, { values: { mean: 250 } }, { values: { mean: 260 } }] }] } });
async function open(browser, vw, vh, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: opts.dsf || 1 });
  const p = await ctx.newPage(); const errors = [];
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  if (opts.lang) await p.addInitScript(l => { try { localStorage.setItem('rotasat_lang', l); } catch (e) {} }, opts.lang);
  if (opts.noWorker) await p.addInitScript(() => { delete window.Worker; });
  await p.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith('file:') || u.startsWith('blob:')) return r.continue();
    if (u.includes('leaflet.js')) return r.fulfill({ path: path.join(NM, 'leaflet/dist/leaflet.js'), contentType: 'text/javascript' });
    if (u.includes('leaflet.css')) return r.fulfill({ path: path.join(NM, 'leaflet/dist/leaflet.css'), contentType: 'text/css' });
    if (u.includes('chart.umd')) return r.fulfill({ path: path.join(NM, 'chart.js/dist/chart.umd.js'), contentType: 'text/javascript' });
    if (u.includes('power.larc.nasa.gov')) { if (opts.powerFail && opts.powerFail()) return r.abort();
      const q = new URL(u).searchParams; const k = nearest(+q.get('latitude'), +q.get('longitude'));
      return r.fulfill({ path: path.join(FX, `power_${k}.json`), contentType: 'application/json' }); }
    if (u.includes('rest.isric.org')) return r.fulfill({ contentType: 'application/json', body: SOIL });
    if (u.includes('nominatim') && u.includes('/search')) { const q = (new URL(u).searchParams.get('q') || '').toLowerCase();   // a small fake of OpenStreetMap search
      const all = [{ lat: '48.8819', lon: '12.5690', name: 'Straubing', display_name: 'Straubing, Niederbayern, Bayern, Deutschland', address: { county: 'Niederbayern', state: 'Bayern', country: 'Deutschland' } },
        { lat: '48.9500', lon: '12.7000', name: 'Straubing-Bogen', display_name: 'Landkreis Straubing-Bogen, Bayern, Deutschland', address: { state: 'Bayern', country: 'Deutschland' } },
        { lat: '41.1300', lon: '27.0900', name: 'Hayrabolu', display_name: 'Hayrabolu, Tekirdağ, Türkiye', address: { state: 'Tekirdağ', country: 'Türkiye' } }];
      const hit = all.filter(x => x.display_name.toLowerCase().includes(q.split(',')[0].trim()));
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify(q.startsWith('straubing') && q.length > 9 && !hit.length ? [all[0]] : hit) }); }
    if (u.includes('nominatim')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ address: { village: 'Testdorf', county: 'Testkreis' } }) });
    if (u.includes('arcgisonline') || u.includes('gibs.earthdata')) return r.fulfill({ body: png, contentType: 'image/png' });
    if (u.includes('fonts.g')) return r.fulfill({ body: '', contentType: 'text/css' });
    return r.abort();
  });
  return { ctx, p, errors };
}
// waits until the answer of the latest run is on the page
const ready = async (p, timeout = 180000) => { await p.waitForFunction(() => { const a = document.getElementById('answer'); return a && a.querySelector('h2') && !a.classList.contains('upd') && +a.dataset.done === runToken; }, null, { timeout }); };
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const snap = p => p.evaluate(() => ({
  head: document.querySelector('#answer h2').textContent, lead: document.querySelector('.lead').textContent,
  strat: lastResults ? pickStrategies(lastResults).map(s => ({ role: s.role, rot: s.r.seq.join('-'), mean: Math.round(s.r.mean), p10: Math.round(s.r.p10), dC: +s.r.dC.toFixed(1), bare: +s.r.bare.toFixed(1), water: Math.round(s.r.water), pest: s.r.pest.level, score: Math.round(s.r.score), fail: +s.r.fail.toFixed(3) })) : [],
  all: lastResults ? lastResults.sorted.map(r => `${r.seq.join('-')}${r.mine ? '*' : ''} ${Math.round(r.score)} | ${Math.round(r.mean)} | ${Math.round(r.p10)} | pest ${r.pest.level}`) : [] }));
module.exports = { chromium, open, ready, overflow, snap, APP, REGION, OUT, NM, FX, path, fs };
