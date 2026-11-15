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
    // regression checks for the calculation fixes of the calc-fix branch (see the comments marked "Fix:" in the model)
    const g = await p.evaluate(() => {
      const soil = getSoil(), sh = getShift(), ys = climate.years, keep = climate;
      const att = {}; for (const k of Object.keys(CROPS)) if (k !== 'fallow') att[k] = +attainable(k, soil).toFixed(2);
      // 1. water balance closes: with no rain at all, a crop cannot use more water in a season than the profile held
      const dry = Object.assign({}, climate, { _wc: null, rRef: null, byYear: {} });
      for (const y of ys) dry.byYear[y] = Object.assign({}, climate.byYear[y], { p: Array(12).fill(0), pe: Array(12).fill(0) });
      climate = dry; let etaMax = 0; try { for (const k of ['maize', 'sugarbeet', 'sunflower']) for (const r of simulate([k], ys.slice(0, 5), soil, { mode: 'now', dT: 0, dP: 0, irr: 0 }, { validation: true })) etaMax = Math.max(etaMax, r.eta); } finally { climate = keep; }
      const awc = awcClay(soil.clay) * (1 + 0.02 * (soil.soc - 15)) * 1.5;   // deepest profile (1.5 m), organic-matter bonus
      // 2. rotation start: runs start evenly in every rotation year
      const mc = monteCarlo(['rapeseed', 'wheat', 'barley'], soil, sh, 5); const nMin = Math.min(...mc.cal.n), nMax = Math.max(...mc.cal.n);
      // 3. crop sequence effects: maize after wheat keeps its yield, wheat after maize loses 7 %; grain legumes get no mineral N
      const wm = simulate(['wheat', 'maize'], ys, soil, sh), rws = simulate(['rapeseed', 'wheat', 'soybean', 'barley'], ys, soil, sh);
      const rfMaize = Math.max(...wm.filter(r => r.crop === 'maize').map(r => r.Rf)), rfWheat = Math.max(...wm.filter(r => r.crop === 'wheat').map(r => r.Rf));
      const soyN = Math.max(...rws.filter(r => r.crop === 'soybean').map(r => r.fert));
      // 4. crops without a world price series move with the others in the historical price years
      const ix = PRICES.years.map((_, i) => pxYear(i)), mul = ix.map(px => pxMul('chickpea', px)), mg = ix.map(px => px.g);
      const S = pickStrategies(lastResults), soilR = S.find(x => x.role === 'soil');
      return { att, etaMax: Math.round(etaMax), awc: Math.round(awc), nMin, nMax, rfMaize, rfWheat, soyN, mulMean: mul.reduce((a, b) => a + b) / mul.length, gMean: mg.reduce((a, b) => a + b) / mg.length, mul0: pxMul('lentil', pxFixed()), soilPest: soilR ? soilR.r.pest.level : 0, awc24: awcClay(24), awc3: awcClay(3) };
    });
    console.log(`  ${k} attainable yields t/ha (test soil): ${Object.entries(g.att).map(([c, v]) => c + ' ' + v).join(', ')}`);
    if (g.etaMax > g.awc + 1) fail(`${k}: water balance does not close, ${g.etaMax} mm used without rain from at most ${g.awc} mm stored`);
    if (g.nMax - g.nMin > 0.02 * g.nMax) fail(`${k}: rotation years not equally often simulated ${g.nMin}..${g.nMax}`);
    if (Math.abs(g.rfMaize - 1) > 1e-9 || Math.abs(g.rfWheat - 0.93) > 1e-9) fail(`${k}: crop sequence factors maize ${g.rfMaize}, wheat after maize ${g.rfWheat}`);
    if (g.soyN !== 0) fail(`${k}: soybean gets ${g.soyN} kg mineral N`);
    if (Math.abs(g.mulMean - g.gMean) > 0.15 || g.mulMean < 1.1 || g.mul0 !== 1) fail(`${k}: chickpea price index ${g.mulMean} vs grain ${g.gMean}`);
    if (g.soilPest === 2) fail(`${k}: the soil and water option has a crop break that is far too short`);
    if (!(g.awc24 >= 150 && g.awc24 <= 160 && g.awc3 === 80)) fail(`awcClay outside FAO-56 Table 19: ${g.awc24}, ${g.awc3}`);
    // yields with the test soil inside bands around district statistics (Destatis, LLG Sachsen-Anhalt, TÜİK); Thrace sunflower is a known
    // limitation of the fixed German crop calendar and is only printed
    const band = { heilbronn: { wheat: [7, 9.5], rapeseed: [3.4, 4.5], soybean: [2.4, 3.4], sugarbeet: [62, 90] }, borde: { wheat: [7.5, 9.5], sugarbeet: [60, 90], rapeseed: [3.4, 4.5] },
      gaeu: { wheat: [7.5, 9.5], sugarbeet: [70, 92], maize: [9, 11.5] }, thrace: { wheat: [3.6, 6], rapeseed: [2.5, 4] } }[k];
    for (const [c, [lo, hi]] of Object.entries(band)) if (!(g.att[c] >= lo && g.att[c] <= hi)) fail(`${k}: ${c} ${g.att[c]} t/ha outside ${lo}..${hi}`);
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
      if (m.rank <= m.n / 3) fail(`${k}: ${c} every year ranks in the top third (${m.rank}/${m.n})`);
      if (!(y[0] < 0.8 * y[2] && y[1] < 0.93 * y[2])) fail(`${k}: break penalty for ${c} too mild`);
    }
  }
  errs.push(...errors); await ctx.close();
  console.log('\nERRORS', errs.length, errs.slice(0, 10), '| failures:', bad);
  await browser.close(); process.exit(bad || errs.length ? 1 : 0);
})();
