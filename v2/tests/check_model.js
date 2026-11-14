// Model numbers per example field: full ranking, the three strategies, and what short crop breaks cost.
// Checks: profits stay in a plausible range, growing rapeseed, sunflower or sugar beet every year ranks near the bottom
// and earns clearly less than the same crop in a rotation with a long enough break, and the calculation time.
const { chromium, open, ready, snap, APP } = require('./harness');
(async () => {
  const browser = await chromium.launch(); const errs = []; let bad = 0; const fail = m => { bad++; console.log('FAIL', m); };
  const { ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' });
  await p.goto(APP); await ready(p);
  const setRot = async seq => { await p.evaluate(s => { for (let i = 0; i < 4; i++) document.getElementById('slot' + i).value = s[i] || ''; runAll(); }, seq); await ready(p); };
  for (const k of (process.argv[2] || 'heilbronn,borde,gaeu,thrace').split(',')) {
    await p.evaluate(key => chooseSite(SITES.find(s => s.key === key)), k); await p.waitForTimeout(200); await ready(p);
    await setRot(['wheat', 'chickpea', 'maize']);
    const t0 = Date.now(); await p.evaluate(() => runAll()); await ready(p); const ms = Date.now() - t0;
    const s = await snap(p);
    console.log(`\n== ${k} (recalculation ${ms} ms)`); console.log(s.head); s.all.forEach(x => console.log('  ' + x));
    console.log('  strategies:', s.strat.map(x => `${x.role}=${x.rot} (${x.mean}/${x.p10}, bare ${x.bare}, water ${x.water}, pest ${x.pest})`).join(' ; '));
    const means = s.strat.map(x => x.mean); if (means.some(v => !isFinite(v) || v < -1500 || v > 3000)) fail(k + ': profit out of range');
    if (s.strat.length !== 3) fail(k + ': expected three strategies');
    for (const c of ['rapeseed', 'sunflower', 'sugarbeet']) {
      await setRot([c]);
      const m = await p.evaluate(() => ({ rank: lastResults.sorted.indexOf(lastResults.me) + 1, n: lastResults.sorted.length, mean: Math.round(lastResults.me.mean), pest: lastResults.me.pest.level, score: Math.round(lastResults.me.score),
        pill: document.querySelector('.strat.s0 .pill').textContent }));
      const rot = { rapeseed: ['rapeseed', 'wheat', 'soybean', 'barley'], sunflower: ['sunflower', 'wheat', 'chickpea', 'barley'], sugarbeet: ['sugarbeet', 'wheat', 'vetch', 'barley'] }[c];
      const y = await p.evaluate(async ([c, rot]) => { const soil = getSoil(), sh = getShift(), ys = climate.years;
        const avg = (seq) => { const r = simulate(seq, ys.concat(ys), soil, sh).filter(x => x.crop === c); return r.reduce((a, x) => a + x.yieldT, 0) / r.length; };
        return [avg([c]), avg([c, 'wheat']), avg(rot)].map(v => +v.toFixed(2)); }, [c, rot]);
      console.log(`  ${c} every year: rank ${m.rank}/${m.n}, fit ${m.score}, profit ${m.mean}, pest level ${m.pest} | yield t/ha every year ${y[0]}, every 2nd year ${y[1]}, every 4th year ${y[2]} | "${m.pill}"`);
      if (m.pest !== 2) fail(`${k}: ${c} every year should be flagged as too short`);
      if (m.rank < m.n - 4) fail(`${k}: ${c} every year ranks too high (${m.rank}/${m.n})`);
      if (!(y[0] < 0.8 * y[2] && y[1] < 0.93 * y[2])) fail(`${k}: break penalty for ${c} too mild`);
    }
  }
  errs.push(...errors); await ctx.close();
  console.log('\nERRORS', errs.length, errs.slice(0, 10), '| failures:', bad);
  await browser.close(); process.exit(bad || errs.length ? 1 : 0);
})();
