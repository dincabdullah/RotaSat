// Uses the app's own model to compute, per example region: attainable yields, crop margins, CMIP6 monthly change, satellite summary.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const SP = path.resolve(__dirname, '..');
const PRE = { heilbronn: [49.1577, 9.109], borde: [52.0569, 11.355], gaeu: [48.8, 12.62], thrace: [41.1951, 27.1061] };
function nearest(lat, lon) { let b = null, d = 1e9; for (const [k, [a, o]] of Object.entries(PRE)) { const x = (a - lat) ** 2 + (o - lon) ** 2; if (x < d) { d = x; b = k; } } return b; }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+P9/PQAJYwN6xRQ2RQAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const out = {};
  await p.route('**/*', async r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue();
    if (u.includes('leaflet.js')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.js') });
    if (u.includes('chart.umd')) return r.fulfill({ path: path.join(__dirname, 'node_modules/chart.js/dist/chart.umd.js') });
    if (u.includes('power.larc')) { const q = new URL(u).searchParams; return r.fulfill({ path: path.join(SP, 'fixtures', `power_${nearest(+q.get('latitude'), +q.get('longitude'))}.json`) }); }
    if (u.includes('isric')) return r.fulfill({ status: 500, body: 'x' });
    if (u.includes('arcgis') || u.includes('gibs')) return r.fulfill({ body: png, contentType: 'image/png' }); return r.abort(); });
  await p.goto('file://' + process.argv[2]);
  for (const key of Object.keys(PRE)) {
    await p.evaluate(k => chooseSite(SITES.find(s => s.key === k)), key);
    await p.waitForFunction(k => site.key === k && climate && lastResults, key, { timeout: 120000 });
    out[key] = await p.evaluate(() => {
      const soil = { soc: 15, clay: 25 }, crops = {};
      const lr = { g: PMEAN.g, m: PMEAN.m, o: PMEAN.o, s: PMEAN.s, n: 1.2 * PMEAN.u, d: dieselFromBrent(PMEAN.b) }, today = { g: 1, m: 1, o: 1, s: 1, n: 1.2, d: dieselFromBrent(95) };
      for (const [k, c] of Object.entries(CROPS)) { if (k === 'fallow') continue;
        const att = attainable(k, soil), fb = (c.fuel || 0) * DIESEL_2025;
        const marg = px => { const price = c.price * (PGROUP[k] ? px[PGROUP[k]] : 1), cost = (c.cost - fb) * (0.45 + 0.55 * Math.min(1, att / c.ym)) + (c.fuel || 0) * px.d, fert = Math.max(0, FERT_SHARE * c.nT * att);
          return Math.round(att * price - cost - fert * px.n); };
        crops[k] = { y: Math.round(att * 10) / 10, mToday: marg(today), mLong: marg(lr), price: c.price }; }
      const cm = sc => { const c = cmip(site.lat, site.lon, sc); if (!c) return null; const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
        return { dT: [...Array(12)].map((_, m) => Math.round(CM_K * med(c.map(x => x.dT[m])) * 10) / 10), dP: [...Array(12)].map((_, m) => Math.round(CM_K * med(c.map(x => x.dP[m])))),
          ann: c.map(x => Math.round(CM_K * x.dT.reduce((a, b) => a + b) / 12 * 10) / 10) }; };
      const s2 = S2[site.key];
      return { crops, cm45: cm('ssp245'), cm85: cm('ssp585'), s2: s2 ? { bare: s2.bareMean, n: s2.n, season: s2.season } : null, trend: Math.round(climate.trend * 100) / 10 };
    });
    console.log(key, JSON.stringify(out[key]).slice(0, 400));
  }
  fs.writeFileSync(path.join(SP, 'region_model.json'), JSON.stringify(out)); await b.close();
})();
