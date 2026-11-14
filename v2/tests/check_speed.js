// Calculation time and main-thread blocking, at normal speed and with the CPU slowed down 6 times (a slow phone),
// with Web Workers and with the main-thread fallback.
const { chromium, open, ready, APP } = require('./harness');
(async () => {
  const browser = await chromium.launch();
  for (const noWorker of [false, true]) for (const rate of [1, 6]) {
    const { ctx, p, errors } = await open(browser, 390, 844, { lang: 'en', noWorker });
    await p.goto(APP); await ready(p);
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const r = await p.evaluate(() => new Promise(res => { let last = performance.now(), worst = 0; const t0 = last; const iv = setInterval(() => { const n = performance.now(); worst = Math.max(worst, n - last); last = n; }, 10);
      runAll(); const chk = setInterval(() => { const a = document.getElementById('answer'); if (!a.classList.contains('upd') && +a.dataset.done === runToken) { clearInterval(iv); clearInterval(chk); res([Math.round(performance.now() - t0), Math.round(worst)]); } }, 20); }));
    console.log(`${noWorker ? 'main-thread fallback' : 'web workers'}, CPU ${rate}x slower: result after ${r[0]} ms, longest main-thread pause ${r[1]} ms, errors ${errors.length}`);
    await ctx.close();
  }
  await browser.close();
})();
