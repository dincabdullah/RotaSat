const { chromium } = require('playwright'); const path = require('path'); const SP = path.resolve(__dirname, '..'); /* repo root: fixtures/ (NASA POWER test data) and test-shots/ */
require('fs').mkdirSync(require('path').resolve(__dirname, '..', 'test-shots'), { recursive: true });
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [r, lang, w] of [['heilbronn', 'tr', 1280], ['heilbronn', 'en', 390], ['borde', 'de', 1280], ['gaeu', 'en', 1280], ['thrace', 'tr', 1280]]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    p.on('pageerror', e => errs.push(r + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errs.push(r + ' ' + m.text()); });
    await p.route('**/*', rr => rr.request().url().startsWith('file:') ? rr.continue() : rr.abort());
    await p.goto(`file://${process.argv[2]}?r=${r}&lang=${lang}`); await p.waitForTimeout(400);
    const info = await p.evaluate(() => ({ title: document.title, cards: document.querySelectorAll('#cards>div').length, rows: document.querySelectorAll('#chg tbody tr').length, cal: document.querySelectorAll('#cal tbody tr').length, sat: document.getElementById('s_sat').textContent.slice(0, 90), warn: !!document.querySelector('.warn'), over: document.documentElement.scrollWidth > innerWidth + 1 }));
    console.log(r, lang, w, JSON.stringify(info));
    await p.screenshot({ path: path.join(SP, 'test-shots', `region_${r}_${lang}_${w}.png`), fullPage: true }); await p.close();
  }
  console.log('ERRORS', errs); await b.close();
})();
