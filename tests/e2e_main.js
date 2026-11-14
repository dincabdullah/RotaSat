// End-to-end check of index.html in Chromium with real NASA POWER fixtures (MERRA-2 from the POWER AWS store).
require('fs').mkdirSync(require('path').resolve(__dirname, '..', 'test-shots'), { recursive: true });
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const SP = path.resolve(__dirname, '..'); /* repo root: fixtures/ (NASA POWER test data) and test-shots/ */ const APP = process.argv[2]; const OUT = process.argv[3] || path.join(SP, 'test-shots');
fs.mkdirSync(OUT, { recursive: true });
const PRE = { heilbronn: [49.1577, 9.109], borde: [52.0569, 11.355], gaeu: [48.8, 12.62], thrace: [41.1951, 27.1061] };
function nearest(lat, lon) { let b = null, d = 1e9; for (const [k, [a, o]] of Object.entries(PRE)) { const x = (a - lat) ** 2 + (o - lon) ** 2; if (x < d) { d = x; b = k; } } return b; }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+P9/PQAJYwN6xRQ2RQAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function page(vw, vh, opts = {}) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: opts.dsf || 1 });
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    await p.route('**/*', async r => {
      const u = r.request().url();
      if (u.startsWith('file:')) return r.continue();
      if (u.includes('leaflet.js')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.js'), contentType: 'text/javascript' });
      if (u.includes('leaflet.css')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.css'), contentType: 'text/css' });
      if (u.includes('chart.umd')) return r.fulfill({ path: path.join(__dirname, 'node_modules/chart.js/dist/chart.umd.js'), contentType: 'text/javascript' });
      if (u.includes('power.larc.nasa.gov')) { const q = new URL(u).searchParams; const k = nearest(+q.get('latitude'), +q.get('longitude'));
        return r.fulfill({ path: path.join(SP, 'fixtures', `power_${k}.json`), contentType: 'application/json' }); }
      if (u.includes('rest.isric.org')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ properties: { layers: [
        { name: 'soc', unit_measure: { d_factor: 10 }, depths: [{ values: { mean: 220 } }, { values: { mean: 150 } }, { values: { mean: 120 } }] },
        { name: 'clay', unit_measure: { d_factor: 10 }, depths: [{ values: { mean: 240 } }, { values: { mean: 250 } }, { values: { mean: 260 } }] }] } }) });
      if (u.includes('arcgisonline')) return r.fulfill({ body: png, contentType: 'image/png' });
      if (u.includes('gibs.earthdata')) { if (!global.gibsSeen) { global.gibsSeen = u; } return r.fulfill({ body: png, contentType: 'image/png' }); }
      if (u.includes('fonts.g')) return r.fulfill({ body: '', contentType: 'text/css' });
      return r.abort();
    });
    return { ctx, p };
  }
  const waitAnswer = p => p.waitForFunction(() => document.querySelector('#answer h2'), null, { timeout: 120000 });
  const url = 'file://' + APP;
  // 1. desktop, English, Heilbronn default
  let { ctx, p } = await page(1440, 900);
  await p.goto(url); await waitAnswer(p);
  const r1 = await p.evaluate(() => ({ head: document.querySelector('#answer h2').textContent, lead: document.querySelector('.lead').textContent,
    sh: [...document.querySelectorAll('.sh>div')].map(d => d.innerText.replace(/\n/g, ' | ')), fut: document.getElementById('fFut').textContent + ' ' + document.getElementById('fFutT').textContent,
    space: !document.getElementById('space').hidden, spBare: document.getElementById('spBare').textContent, spObs: document.getElementById('spObs').textContent,
    rows: [...document.querySelectorAll('.cmp tbody tr')].map(tr => tr.innerText.replace(/\s+/g, ' ').trim()) }));
  console.log('EN today', JSON.stringify(r1, null, 1));
  console.log('region note', await p.evaluate(() => [!document.getElementById('regionNote').hidden, document.getElementById('rnText').textContent.slice(0, 80)].join(' | ')));
  await p.click('#rnBtn'); await p.waitForTimeout(300); await waitAnswer(p);
  console.log('after suggested priorities', await p.evaluate(() => ['wInc','wRisk','wSoil','wWater'].map(i => document.getElementById(i).value).join(',') + ' | ' + document.querySelector('#answer h2').textContent));
  await p.screenshot({ path: path.join(OUT, 'd_en_full.png'), fullPage: true });
  // 1b. NASA layers
  for (const k of ['tc', 'ndvi', 'smap', 'esri']) { await p.check(`#lyBox input[value="${k}"]`); await p.waitForTimeout(400);
    console.log('layer', k, await p.evaluate(() => [document.querySelector('#lyBox p').textContent, document.getElementById('roSrc').textContent, heroMap.getZoom()].join(' | '))); }
  console.log('GIBS request', global.gibsSeen);
  await p.check('#lyBox input[value="ndvi"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, 'd_layer_ndvi.png') }); await p.check('#lyBox input[value="esri"]');
  // 2. 2050 middle and high
  for (const sc of ['ssp245', 'ssp585']) {
    await p.click(`[data-scen="${sc}"]`); await p.waitForTimeout(300); await waitAnswer(p);
    await p.waitForFunction(() => !document.getElementById('status'), null, { timeout: 120000 }).catch(() => {});
    console.log(sc, await p.evaluate(() => document.querySelector('#answer .mono').textContent + ' || ' + document.querySelector('#answer h2').textContent + ' || ' + document.querySelector('.lead').textContent + ' || ' + [...document.querySelectorAll('.cmp tbody tr')].map(tr => tr.innerText.replace(/\s+/g, ' ').trim()).join(' ## ')));
  }
  // 3. share link round trip
  const hash = await p.evaluate(() => stateHash()); console.log('hash', hash);
  await ctx.close();
  ({ ctx, p } = await page(1440, 900));
  await p.goto(url + hash.replace('lang=en', 'lang=tr')); await waitAnswer(p);
  console.log('from link (TR)', await p.evaluate(() => [document.documentElement.lang, document.querySelector('#answer .mono').textContent, document.querySelector('#answer h2').textContent].join(' || ')));
  await p.screenshot({ path: path.join(OUT, 'd_tr_link.png'), fullPage: true });
  // 4. Konya in German
  await p.click('[data-lang="de"]'); await p.click('[data-site="thrace"]'); await p.waitForTimeout(500); await waitAnswer(p);
  await p.waitForFunction(() => document.querySelector('#answer h2') && document.getElementById('fieldName').textContent.includes('Thra'), null, { timeout: 120000 });
  await p.waitForTimeout(1500);
  console.log('Thrace DE', await p.evaluate(() => [document.querySelector('#answer h2').textContent, document.querySelector('.lead').textContent, document.getElementById('fFut').textContent, document.getElementById('spBare').textContent].join(' || ')));
  await p.screenshot({ path: path.join(OUT, 'd_de_konya.png'), fullPage: true });
  await ctx.close();
  // 5. phone, Turkish
  ({ ctx, p } = await page(390, 844));
  await p.addInitScript(() => { try { localStorage.setItem('rotasat_lang', 'tr'); } catch (e) {} });
  await p.goto(url); await waitAnswer(p);
  await p.screenshot({ path: path.join(OUT, 'm_tr_full.png'), fullPage: true });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  console.log('phone horizontal overflow:', overflow);
  await ctx.close();
  // 6. logo close-up
  ({ ctx, p } = await page(600, 120, { dsf: 4 }));
  await p.goto(url); await p.waitForTimeout(800);
  await p.locator('header .logo').screenshot({ path: path.join(OUT, 'logo.png') });
  await ctx.close();
  console.log('ERRORS', errors.length, errors.slice(0, 10));
  await browser.close();
})();
