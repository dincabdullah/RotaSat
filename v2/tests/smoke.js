// Quick look: loads the default field, prints the three strategies and the full ranking, takes desktop and phone screenshots.
const { chromium, open, ready, overflow, snap, APP, OUT, path } = require('./harness');
(async () => {
  const browser = await chromium.launch(); const errs = [];
  for (const [w, h, lang] of [[1440, 900, 'en'], [390, 844, 'tr']]) {
    const { ctx, p, errors } = await open(browser, w, h, { lang });
    const t0 = Date.now(); await p.goto(APP); await ready(p);
    console.log(w, lang, 'ready after', Date.now() - t0, 'ms; workers:', await p.evaluate(() => [WORKER_OK, POOLS.main.ws && POOLS.main.ws.length].join(' / ')));
    if (w === 1440) console.log(JSON.stringify(await snap(p), null, 1));
    console.log('answer top px:', await p.evaluate(() => Math.round(document.getElementById('answer').getBoundingClientRect().top + scrollY)), '| page height:', await p.evaluate(() => document.documentElement.scrollHeight), '| overflow px:', await overflow(p));
    await p.screenshot({ path: path.join(OUT, `smoke_${w}_${lang}.png`), fullPage: true });
    errs.push(...errors); await ctx.close();
  }
  console.log('ERRORS', errs.length, errs.slice(0, 10));
  await browser.close();
})();
