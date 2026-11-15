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
// SheetJS for the Excel import (served in place of cdnjs): ROTASAT_XLSX = the xlsx package folder, or xlsx next to Playwright
let XLSX_JS = null;
for (const d of [process.env.ROTASAT_XLSX, path.join(NM, 'xlsx')].filter(Boolean)) { const f = path.join(d, 'dist', 'xlsx.full.min.js'); if (fs.existsSync(f)) { XLSX_JS = f; break; } }
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
// a solid PNG of one colour (the GIBS land cover answer of the fake)
const zlib = require('zlib');
function crc32(b) { let c, crc = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (crc ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function solidPng(r, g, b, n = 5) {
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(n, 0); ihdr.writeUInt32BE(n, 4); ihdr[8] = 8; ihdr[9] = 6;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(n).fill([r, g, b, 255]).flat())]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array(n).fill(row)))), chunk('IEND', Buffer.alloc(0))]);
}
// the land check of the fake: places with buildings, water, forest, the open sea and a spot where both services never answer;
// everywhere else farmland (OpenStreetMap landuse=farmland, MODIS class 12 croplands)
const LAND = {
  bld: { at: [48.90, 12.65], osm: { bld: 3, areas: 6, tags: [{ landuse: 'residential' }] }, modis: [165, 165, 165] },
  water: { at: [47.60, 9.40], osm: { bld: 0, areas: 4, tags: [{ natural: 'water', water: 'lake' }] }, modis: [28, 13, 255] },
  forest: { at: [48.70, 12.40], osm: { bld: 0, areas: 5, tags: [{ landuse: 'forest' }] }, modis: [0, 153, 0] },
  sea: { at: [54.50, 7.50], osm: { bld: 0, areas: 0, tags: [] }, modis: [28, 13, 255] },
  slow: { at: [50.00, 10.00], hang: true },
  farm: { osm: { bld: 0, areas: 5, tags: [{ landuse: 'farmland' }] }, modis: [194, 79, 68] } };
const landAt = (lat, lon) => Object.values(LAND).find(v => v.at && Math.abs(v.at[0] - lat) < 0.006 && Math.abs(v.at[1] - lon) < 0.006) || LAND.farm;
const overpassBody = o => JSON.stringify({ elements: [{ type: 'count', id: 0, tags: { ways: String(o.bld), total: String(o.bld) } }, { type: 'count', id: 0, tags: { areas: String(o.areas), total: String(o.areas) } },
  ...o.tags.map((tg, i) => ({ type: 'area', id: 3600000000 + i, tags: tg }))] });
// places for the import: a small fake of Nominatim (village or town to coordinates)
const PLACES = { straubing: [48.8819, 12.569], hayrabolu: [41.13, 27.09], testdorf: [49.2, 9.3], seedorf: [47.6, 9.4], 'gäuboden': [48.8, 12.62] };
async function open(browser, vw, vh, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: opts.dsf || 1 });
  const p = await ctx.newPage(); const errors = []; const calls = { overpass: 0, landcover: 0, search: 0, searchAt: [] };
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
    if (u.includes('overpass-api.de')) { calls.overpass++; if (opts.landFail) return r.abort();
      const m = /around%3A15%2C(-?[\d.]+)%2C(-?[\d.]+)/.exec(r.request().postData() || '') || /around:15,(-?[\d.]+),(-?[\d.]+)/.exec(decodeURIComponent(r.request().postData() || ''));
      const L = m ? landAt(+m[1], +m[2]) : LAND.farm; if (L.hang) return;   // never answers
      return r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: overpassBody(L.osm) }); }
    if (u.includes('gibs.earthdata') && u.includes('IGBP_Land_Cover')) { calls.landcover++; if (opts.landFail) return r.abort();
      const b = new URL(u).searchParams.get('BBOX').split(',').map(Number), L = landAt((b[1] + b[3]) / 2, (b[0] + b[2]) / 2); if (L.hang) return;
      return r.fulfill({ contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: solidPng(...L.modis) }); }
    if (u.includes('cdnjs.cloudflare.com/ajax/libs/xlsx/')) { if (!XLSX_JS || opts.xlsxFail) return r.abort(); return r.fulfill({ path: XLSX_JS, contentType: 'text/javascript' }); }
    if (u.includes('nominatim') && u.includes('/search') && u.includes('limit=1&')) { calls.search++; calls.searchAt.push(Date.now());   // one place per request (My fields, import)
      const q = (new URL(u).searchParams.get('q') || '').toLowerCase().split(',')[0].trim(), hit = PLACES[q];
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify(hit ? [{ lat: String(hit[0]), lon: String(hit[1]), name: q, display_name: q.charAt(0).toUpperCase() + q.slice(1) + ', Testkreis, Testland' }] : []) }); }
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
  return { ctx, p, errors, calls };
}
// waits until the answer of the latest run is on the page
const ready = async (p, timeout = 180000) => { await p.waitForFunction(() => { const a = document.getElementById('answer'); return a && a.querySelector('h2') && !a.classList.contains('upd') && +a.dataset.done === runToken; }, null, { timeout }); };
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const snap = p => p.evaluate(() => ({
  head: document.querySelector('#answer h2').textContent, lead: document.querySelector('.lead').textContent,
  strat: lastResults ? pickStrategies(lastResults).map(s => ({ role: s.role, rot: s.r.seq.join('-'), mean: Math.round(s.r.mean), p10: Math.round(s.r.p10), dC: +s.r.dC.toFixed(1), bare: +s.r.bare.toFixed(1), water: Math.round(s.r.water), pest: s.r.pest.level, score: Math.round(s.r.score), fail: +s.r.fail.toFixed(3) })) : [],
  all: lastResults ? lastResults.sorted.map(r => `${r.seq.join('-')}${r.mine ? '*' : ''} ${Math.round(r.score)} | ${Math.round(r.mean)} | ${Math.round(r.p10)} | pest ${r.pest.level}`) : [] }));
module.exports = { XLSX_JS, LAND, PLACES, solidPng, chromium, open, ready, overflow, snap, APP, REGION, OUT, NM, FX, path, fs };
