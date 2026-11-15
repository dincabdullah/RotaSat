// Screenshots of the three steps: node wizard_shots.js [langs] [sizes]   e.g. node wizard_shots.js en,tr 1440x900,390x844
const { chromium, open, ready, APP, OUT, path } = require('./harness');
(async () => {
  const langs = (process.argv[2] || 'en,tr').split(','), sizes = (process.argv[3] || '1440x900,390x844').split(',').map(s => s.split('x').map(Number));
  const browser = await chromium.launch(); let errs = 0;
  for (const lang of langs) for (const [w, h] of sizes) {
    const { ctx, p, errors } = await open(browser, w, h, { lang, dsf: 2 });
    await p.goto(APP); await ready(p); await p.waitForTimeout(400);
    const tag = `${lang}_${w}`;
    await p.screenshot({ path: path.join(OUT, `step1_${tag}.png`) });
    await p.click('#srchQ'); await p.keyboard.type('Straub'); await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(OUT, `step1_search_${tag}.png`) });
    await p.keyboard.press('Escape'); await p.evaluate(() => { document.getElementById('srchQ').value = ''; document.getElementById('srchQ').blur(); });
    await p.click('#nextBtn'); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `step2_${tag}.png`) });
    if (w < 800) await p.screenshot({ path: path.join(OUT, `step2_full_${tag}.png`), fullPage: true });
    await p.click('#nextBtn'); await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(OUT, `step3_${tag}.png`) });
    await p.screenshot({ path: path.join(OUT, `step3_full_${tag}.png`), fullPage: true });
    console.log(tag, 'overflow', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'errors', errors);
    errs += errors.length; await ctx.close();
  }
  await browser.close(); process.exit(errs ? 1 : 0);
})();
