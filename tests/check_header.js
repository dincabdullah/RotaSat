const { chromium } = require('playwright'); const path = require('path'); const SP = path.resolve(__dirname, '..'); /* repo root: fixtures/ (NASA POWER test data) and test-shots/ */
require('fs').mkdirSync(require('path').resolve(__dirname, '..', 'test-shots'), { recursive: true });
(async () => { const b = await chromium.launch();
  for (const w of [1000, 1280, 1440]) for (const lang of ['de', 'tr', 'en']) {
    const p = await b.newPage({ viewport: { width: w, height: 400 } });
    await p.addInitScript(l => { try { localStorage.setItem('rotasat_lang', l); } catch (e) {} }, lang);
    await p.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue();
      if (u.includes('leaflet.js')) return r.fulfill({ path: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.js') });
      if (u.includes('chart.umd')) return r.fulfill({ path: path.join(__dirname, 'node_modules/chart.js/dist/chart.umd.js') }); return r.abort(); });
    await p.goto('file://' + process.argv[2]); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const h = document.querySelector('header'), l = document.querySelector('.langs').getBoundingClientRect(), lg = document.querySelector('.logo').getBoundingClientRect(); return { h: Math.round(h.getBoundingClientRect().height), langsTop: Math.round(l.top), logoTop: Math.round(lg.top), right: Math.round(innerWidth - l.right) }; });
    console.log(w, lang, JSON.stringify(r)); if (w === 1000 && lang === 'de') await p.screenshot({ path: path.join(SP, 'test-shots', 'header_de_1000.png') }); await p.close(); }
  await b.close(); })();
