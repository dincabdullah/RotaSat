// End-to-end check of v2/index.html and v2/region.html: three languages, four widths, four example fields, an own field,
// farmer limits, share link, climate and price settings, terms, My fields, the main-thread fallback and the retry after a NASA failure.
const { chromium, open, ready, overflow, snap, APP, REGION, OUT, path } = require('./harness');
(async () => {
  const browser = await chromium.launch(); const errs = []; let bad = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
  const cards = p => p.evaluate(() => ({ strat: document.querySelectorAll('.strat').length, cal: document.querySelectorAll('.strat .cal').length, xp: [...document.querySelectorAll('.strat .xp')].map(d => d.querySelectorAll('dt').length),
    why: document.querySelectorAll('.strat .why').length, pills: document.querySelectorAll('.strat .pill').length, glance: document.querySelectorAll('.glance .grow').length,
    rows: document.querySelectorAll('.cmp tbody tr').length, dash: document.body.innerText.includes('—'), raw: /\{[a-z0-9]+\}|undefined|NaN/.test(document.getElementById('answer').innerText),
    top: Math.round(document.getElementById('answer').getBoundingClientRect().top + scrollY) }));
  // 1. every language at every width, default field
  for (const lang of ['en', 'tr', 'de']) for (const [w, h] of [[1440, 900], [1000, 800], [390, 844], [320, 640]]) {
    const { ctx, p, errors } = await open(browser, w, h, { lang }); await p.goto(APP); await ready(p);
    const c = await cards(p), ov = await overflow(p), tag = `${lang} ${w}px`;
    ok(c.strat === 3 && c.cal === 3 && c.why === 3 && c.pills === 3 && c.xp.every(x => x === 4), `${tag}: three strategy cards with calendar, pest line and five explanations ${JSON.stringify(c)}`);
    ok(c.glance === 8 && c.rows >= 10, `${tag}: comparison table rows ${c.glance}, all rotations ${c.rows}`);
    ok(!c.dash, `${tag}: em dash in the page text`); ok(!c.raw, `${tag}: unfilled placeholder or NaN in the answer`);
    ok(ov <= 1, `${tag}: horizontal overflow ${ov}px`);
    ok(w > 760 ? c.top < 900 : c.top < 1200, `${tag}: answer starts at ${c.top}px`);
    ok(await p.evaluate(() => document.documentElement.lang) === lang, `${tag}: html lang`);
    // widest element check inside the answer (cards, calendar, tables may scroll inside their own box only)
    const wide = await p.evaluate(() => [...document.querySelectorAll('#answer *, #ground *, #limits *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !e.closest('.tbl'); }).length);
    ok(wide === 0, `${tag}: ${wide} elements stick out of the screen`);
    if (lang === 'en') console.log(tag, 'answer top', c.top, 'page height', await p.evaluate(() => document.documentElement.scrollHeight));
    if (w === 390 || (w === 1440 && lang !== 'en')) await p.screenshot({ path: path.join(OUT, `e2e_${lang}_${w}.png`), fullPage: true });
    errs.push(...errors.map(e => tag + ' ' + e)); await ctx.close();
  }
  // 2. four example fields, 2050, prices, limits, terms, share link (desktop, English)
  let { ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' }); await p.goto(APP); await ready(p);
  for (const k of ['borde', 'gaeu', 'thrace', 'heilbronn']) {
    await p.click(`[data-site="${k}"]`); await p.waitForTimeout(200); await ready(p);
    const s = await snap(p), c = await cards(p);
    console.log(k, '|', s.head, '|', s.strat.map(x => `${x.role}:${x.rot} ${x.mean}/${x.p10}`).join(' ; '));
    ok(c.strat === 3 && s.strat[0].role === 'mine', `${k}: three strategies, the first is the farmer's own`);
    ok(s.strat.every(x => x.mean > -800 && x.mean < 2500 && x.p10 <= x.mean + 1 && x.bare >= 0 && x.bare <= 12 && x.water >= 0 && x.water < 600), `${k}: numbers plausible ${JSON.stringify(s.strat)}`);
    ok(!(await p.evaluate(() => document.getElementById('space').hidden)) && (await p.evaluate(() => document.getElementById('spMonths').textContent.length > 20)), `${k}: satellite panel with bare months`);
    if (k === 'thrace') ok(await p.evaluate(() => document.querySelector('.strat.s0').innerText.includes('Turkish prices')), 'thrace: price gap named in the card');
  }
  const base = await snap(p);
  for (const sc of ['ssp245', 'ssp585', 'now']) { await p.click(`[data-scen="${sc}"]`); await ready(p); const s = await snap(p);
    console.log(sc, '|', await p.evaluate(() => document.querySelector('#answer .mono').textContent), '|', s.strat.map(x => x.mean).join('/'));
    if (sc !== 'now') ok(JSON.stringify(s.strat) !== JSON.stringify(base.strat), sc + ': numbers change'); else ok(JSON.stringify(s.strat) === JSON.stringify(base.strat), 'back to today: same numbers as before (deterministic)'); }
  for (const pm of ['fixed', 'y2022', 'y2026', 'hist']) { await p.selectOption('#priceMode', pm); await ready(p); console.log('prices', pm, (await snap(p)).strat.map(x => x.mean).join('/')); }
  // limits: no sugar beet, cannot sell rapeseed, no forage use
  await p.check('#eqBeet'); await ready(p);
  await p.evaluate(() => document.querySelector('#noSell input[value="rapeseed"]').click()); await ready(p);
  let s = await snap(p);
  ok(!s.all.some(x => /sugarbeet|rapeseed/.test(x)), 'limits: sugar beet and rapeseed rotations are left out');
  ok(await p.evaluate(() => /sugar beet/.test(document.getElementById('answer').innerText) && document.getElementById('limNote').textContent.length > 10), 'limits: the page says what was left out');
  const vetch1 = await p.evaluate(() => lastResults.rots.find(r => r.seq.join() === 'maize,wheat,vetch').mean);
  await p.uncheck('#forage'); await ready(p);
  const vetch0 = await p.evaluate(() => lastResults.rots.find(r => r.seq.join() === 'maize,wheat,vetch').mean);
  ok(vetch0 < vetch1 - 50, `limits: without a forage buyer vetch earns less (${Math.round(vetch1)} to ${Math.round(vetch0)})`);
  // own rotation with an excluded crop is kept and flagged
  await p.evaluate(() => { document.getElementById('slot0').value = 'rapeseed'; document.getElementById('slot0').onchange(); }); await ready(p);
  ok(await p.evaluate(() => /question 4/.test(document.querySelector('.strat.s0').innerText)), 'limits: own rotation with an excluded crop is flagged');
  // all limits on: fewer than three strategies still renders
  await p.check('#eqRow'); await ready(p);
  await p.evaluate(() => { document.querySelectorAll('#noSell input').forEach(i => { if (!i.checked) i.click(); }); }); await ready(p);
  ok(await p.evaluate(() => document.querySelectorAll('.strat').length >= 1 && document.querySelector('#answer h2') !== null), 'limits: page still works when every ready-made rotation is excluded');
  await p.evaluate(() => { document.querySelectorAll('#noSell input').forEach(i => { if (i.checked && i.value !== 'rapeseed') i.click(); }); }); await p.uncheck('#eqRow'); await ready(p);
  // irrigation
  await p.evaluate(() => { const e = document.getElementById('irr'); e.value = 100; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change')); }); await ready(p);
  ok(await p.evaluate(() => lastResults.me.irr > 1 && /pump/.test(document.getElementById('answer').innerText)), 'irrigation: used and a local check on water right is listed');
  // terms
  await p.click('[data-term="et"]'); ok(await p.evaluate(() => document.getElementById('termBox').textContent.length > 80), 'terms: explanation opens in place');
  // share link round trip, in German
  const hash = await p.evaluate(() => stateHash()); const before = await snap(p); console.log('hash', hash);
  errs.push(...errors); await ctx.close();
  ({ ctx, p, errors } = await open(browser, 1440, 900, {})); await p.goto(APP + hash.replace('lang=en', 'lang=de')); await ready(p);
  const after = await snap(p);
  ok(JSON.stringify(after.strat) === JSON.stringify(before.strat), 'share link: same numbers in a new tab ' + JSON.stringify([before.strat.map(x => x.mean), after.strat.map(x => x.mean)]));
  ok(await p.evaluate(() => document.documentElement.lang === 'de' && document.getElementById('eqBeet').checked && !document.getElementById('forage').checked && document.querySelector('#noSell input[value="rapeseed"]').checked), 'share link: language and limits restored');
  // own field (Europe) and a field outside the CMIP6 grid
  await p.evaluate(() => chooseSite({ key: 'custom', lat: 48.3, lon: 12.1 })); await p.waitForTimeout(200); await ready(p);
  ok(await p.evaluate(() => document.getElementById('space').hidden && document.getElementById('regionNote').hidden && document.querySelectorAll('.strat').length === 3), 'own field: result without satellite panel and region note');
  ok(await p.evaluate(() => document.querySelector('.strat.s0').innerText.includes('Satellitengeschichte')), 'own field: missing satellite history named as a gap');
  await p.evaluate(() => chooseSite({ key: 'custom', lat: 41.0, lon: -95.0 })); await p.waitForTimeout(200); await ready(p);
  await p.click('[data-scen="ssp245"]'); await ready(p);
  ok(await p.evaluate(() => lastResults.shift.mode === '2050'), 'outside Europe: 2050 falls back to the trend');
  // glossary, ground section, layer switch
  ok(await p.evaluate(() => document.querySelectorAll('#termList dt').length === 11 && document.querySelectorAll('#glossList dt').length >= 18 && document.querySelectorAll('#resBody tr').length === 6 && document.querySelectorAll('.judge li').length === 5), 'glossary terms, data table and judgement list are filled');
  await p.click('#openOwn'); ok(await p.evaluate(() => document.getElementById('moreOpts').open), 'ground: button opens the rain and soil inputs');
  for (const k of ['ndvi', 'smap', 'esri']) { await p.check(`#lyBox input[value="${k}"]`); await p.waitForTimeout(200); }
  // print report
  await p.evaluate(() => { window.print = () => {}; printReport(); }); ok(await p.evaluate(() => document.getElementById('report').querySelectorAll('.strat').length >= 1), 'report: contains the strategy cards');
  errs.push(...errors); await ctx.close();
  // 3. My fields on a phone
  ({ ctx, p, errors } = await open(browser, 390, 844, { lang: 'tr' })); await p.goto(APP); await ready(p);
  await p.fill('#fName', 'Ev tarlası'); await p.fill('#fHa', '12'); await p.click('#fForm button[type=submit]');
  await p.fill('#fName', 'Straubing'); await p.fill('#fPlace', 'Straubing'); await p.fill('#fHa', '8'); await p.click('#fForm button[type=submit]');
  await p.waitForFunction(() => FIELDS.length === 2 && FIELDS.every(f => FRES[f.id] && FRES[f.id].best), null, { timeout: 120000 });
  ok(await p.evaluate(() => /20/.test(document.getElementById('fTotal').textContent)), 'my fields: two fields with a farm total');
  ok(await overflow(p) <= 1, 'my fields on a phone: no overflow'); errs.push(...errors); await ctx.close();
  // 4. no Web Worker: same numbers from the main thread
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' })); await p.goto(APP); await ready(p); const withW = await snap(p); const wk = await p.evaluate(() => WORKER_OK && POOLS.main.ws.length); await ctx.close();
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en', noWorker: true })); await p.goto(APP); await ready(p); const noW = await snap(p);
  ok(wk >= 1, 'web worker runs from file:// (workers: ' + wk + ')');
  ok(await p.evaluate(() => WORKER_OK === false), 'fallback: worker switched off in this run');
  ok(JSON.stringify(withW.strat) === JSON.stringify(noW.strat), 'fallback: main thread gives the same numbers as the worker');
  errs.push(...errors); await ctx.close();
  // 5. NASA POWER fails once, the button retries
  let failNow = true; ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en', powerFail: () => failNow }));
  await p.goto(APP); await p.waitForFunction(() => document.querySelector('#status.err'), null, { timeout: 60000 });
  failNow = false; await p.click('#runBtn'); await ready(p); ok(true, 'retry'); await ctx.close();   // the console error of the failed request is expected here
  // 6. page stays responsive while calculating: a timer keeps firing during a run
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' })); await p.goto(APP); await ready(p);
  const gapMs = await p.evaluate(() => new Promise(res => { let last = performance.now(), worst = 0; const iv = setInterval(() => { const n = performance.now(); worst = Math.max(worst, n - last); last = n; }, 10);
    document.querySelector('[data-scen="ssp585"]').click(); const chk = setInterval(() => { const a = document.getElementById('answer'); if (!a.classList.contains('upd') && +a.dataset.done === runToken) { clearInterval(iv); clearInterval(chk); res(Math.round(worst)); } }, 20); }));
  console.log('longest main-thread pause during a run:', gapMs, 'ms'); ok(gapMs < 400, 'main thread blocked for ' + gapMs + ' ms'); errs.push(...errors); await ctx.close();
  // 7. region page
  for (const r of ['heilbronn', 'borde', 'gaeu', 'thrace']) for (const lang of ['en', 'tr', 'de']) {
    ({ ctx, p, errors } = await open(browser, r === 'thrace' ? 390 : 1440, 900, {})); await p.goto(`${REGION}?r=${r}&lang=${lang}`); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.body.innerText.length > 1500 && !document.body.innerText.includes('—')), `region ${r} ${lang}: filled`);
    ok(await p.evaluate(() => /index\.html#lat=/.test(document.getElementById('planLink').href)), `region ${r} ${lang}: link back to the v2 planner`);
    ok(await overflow(p) <= 1, `region ${r} ${lang}: overflow`); errs.push(...errors); await ctx.close(); }
  console.log(`\nchecks: ${n}, failed: ${bad}`); console.log('ERRORS', errs.length, errs.slice(0, 10));
  await browser.close(); process.exit(bad || errs.length ? 1 : 0);
})();
