// Screenshots of chosen parts of the page: node shots.js <width> <height> <lang> <site> <selector or y> [more selectors or y ...]
const { chromium, open, ready, APP, OUT, path } = require('./harness');
(async () => {
  const [w, h, lang, siteKey, ...targets] = process.argv.slice(2);
  const browser = await chromium.launch();
  const { ctx, p, errors } = await open(browser, +w, +h, { lang });
  await p.goto(APP); await ready(p);
  if (siteKey && siteKey !== 'heilbronn') { await p.evaluate(k => chooseSite(SITES.find(s => s.key === k)), siteKey); await p.waitForTimeout(300); await ready(p); }
  let i = 0;
  for (const tg of targets) {
    const y = /^\d+$/.test(tg) ? +tg : await p.evaluate(s => Math.max(0, Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY - 8)), tg);
    await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(250);
    const f = path.join(OUT, `shot_${w}_${lang}_${siteKey}_${i++}.png`); await p.screenshot({ path: f }); console.log(f, 'y=' + y);
  }
  console.log('ERRORS', errors.length, errors.slice(0, 5));
  await browser.close();
})();
