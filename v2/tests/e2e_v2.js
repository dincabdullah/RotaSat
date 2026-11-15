// End-to-end check of v2/index.html (three-step guided flow) and v2/region.html: three languages, four widths, the three steps,
// step header, Next and Back, browser Back, deep links with &step=, search with suggestions and the keyboard, map picking, layer
// thumbnails, real map tiles only (no drawn placeholder), four example fields, an own field, farmer limits, share link, climate and
// price settings, terms, evidence, My fields, the main-thread fallback and the retry after a NASA failure.
const { chromium, open, ready, overflow, snap, APP, REGION, OUT, path } = require('./harness');
(async () => {
  const browser = await chromium.launch(); const errs = []; let bad = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
  const go = (p, k) => p.evaluate(s => { go(s); }, k);
  const step = p => p.evaluate(() => +document.body.dataset.step);
  const visible = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
  const cards = p => p.evaluate(() => ({ strat: document.querySelectorAll('.strat').length, cal: document.querySelectorAll('.strat .cal').length, xp: [...document.querySelectorAll('.strat .xp')].map(d => d.querySelectorAll('dt').length),
    why: document.querySelectorAll('.strat .why').length, pills: document.querySelectorAll('.strat .pill').length, dl: [...document.querySelectorAll('.strat > dl')].map(d => d.querySelectorAll('dd').length),
    rows: document.querySelectorAll('.cmp tbody tr').length, tiles: document.querySelectorAll('#ansRest .tiles .tile').length, tileLinks: document.querySelectorAll('#ansRest .tiles a.tile').length,
    dash: document.body.innerText.includes('—') || document.body.textContent.replace(/const (CM6|S2)=[\s\S]*?\n/g, '').includes('—'), raw: /\{[a-z0-9]+\}|undefined|NaN/.test(document.getElementById('answer').textContent + document.getElementById('evidence').textContent + document.getElementById('s2').textContent + document.getElementById('s1').textContent),
    strip: [...document.querySelectorAll('#answer .bstrip .bsrow:not(.bshd)')].map(r => r.querySelectorAll('.bc').length + (r.getAttribute('role') === 'img' && r.getAttribute('aria-label').length > 30 ? '' : 'noalt')).join(','),
    stripCol: (() => { const a = document.querySelector('#answer .bc i.g'), b = document.querySelector('.strat .cal .c.g'), x = document.querySelector('#answer .bc i.b'), y = document.querySelector('.strat .cal .c.b');
      return !!(a && b && x && y) && getComputedStyle(a).backgroundColor === getComputedStyle(b).backgroundColor && getComputedStyle(x).backgroundColor === getComputedStyle(y).backgroundColor; })(),
    heroB: Math.round(document.querySelector('#ansHero').getBoundingClientRect().bottom), barT: Math.round(document.getElementById('wbar').getBoundingClientRect().top) }));
  // the map shows only real tile images (Esri or NASA GIBS), never a drawn placeholder
  const realMap = p => p.evaluate(() => { const tiles = [...document.querySelectorAll('#heroMap img.leaflet-tile, #miniMap img.leaflet-tile')];
    return { canvas: document.querySelectorAll('#mw canvas, #miniMap canvas, .fieldcard canvas, canvas.mapbg').length, tiles: tiles.length, real: tiles.every(i => /arcgisonline\.com|gibs\.earthdata\.nasa\.gov/.test(i.src)) }; });
  // 1. every language at every width: the three steps
  for (const lang of ['en', 'tr', 'de']) for (const [w, h] of [[1440, 900], [1000, 800], [390, 844], [320, 640]]) {
    const { ctx, p, errors } = await open(browser, w, h, { lang }); await p.goto(APP); await ready(p);
    const tag = `${lang} ${w}px`;
    ok(await step(p) === 1 && await visible(p, '#heroMap') && !(await visible(p, '#s2')) && !(await visible(p, '#s3')), `E01 ${tag}: opens on step 1 with the map`);
    const mb = await p.evaluate(() => { const r = document.getElementById('heroMap').getBoundingClientRect(), z = heroMap.getSize(); return { w: Math.round(r.width), h: Math.round(r.height), lw: z.x, lh: z.y }; });
    ok(mb.w === mb.lw && mb.h === mb.lh && mb.h >= (w < 800 ? 400 : 560) && mb.w >= (w < 800 ? w - 30 : 560), `E01 ${tag}: big map, Leaflet size matches ${JSON.stringify(mb)}`);
    const rm = await realMap(p); ok(rm.canvas === 0 && rm.tiles > 0 && rm.real, `E01 ${tag}: map made of real Esri tiles only ${JSON.stringify(rm)}`);
    ok(await overflow(p) <= 1, `E01 E35 ${tag}: step 1 overflow ${await overflow(p)}px`);
    ok(await p.evaluate(() => document.querySelectorAll('#sites .site').length === 4 && document.querySelectorAll('#lyBox [data-ly]').length === 4 && document.querySelectorAll('#mapCtl button').length === 4), `E01 ${tag}: example fields, layer thumbnails, map buttons`);
    await p.click('#nextBtn'); await p.waitForTimeout(150);
    ok(await step(p) === 2 && await visible(p, '#rotChips') && await visible(p, '#s2 [data-scen="now"]') && await visible(p, '#wInc'), `E02 ${tag}: Next opens step 2`);
    ok(await overflow(p) <= 1, `E35 ${tag}: step 2 overflow`);
    await p.click('#nextBtn'); await p.waitForTimeout(250);
    ok(await step(p) === 3, `E02 ${tag}: Next opens step 3`);
    const c = await cards(p), ov = await overflow(p);
    ok(c.strat === 3 && c.cal === 3 && c.why === 3 && c.pills === 3 && c.xp.every(x => x === 4) && c.dl.every(x => x === 6), `E21 ${tag}: three option cards with six numbers, calendar, crop break and five explanations ${JSON.stringify(c)}`);
    ok(c.rows >= 10 && c.tiles === 3 && c.tileLinks === 3, `E24 E23 ${tag}: all rotations ${c.rows}, evidence tiles ${c.tiles}`);
    ok(!c.dash, `E34 ${tag}: em dash in the page text`); ok(!c.raw, `E34 ${tag}: unfilled placeholder or NaN`);
    ok(ov <= 1, `E35 ${tag}: step 3 overflow ${ov}px`);
    ok(c.strip === '12,12', `E22 ${tag}: bare soil strip has two rows of 12 months with a text alternative (${c.strip})`);
    ok(c.stripCol, `E22 ${tag}: strip colours are the calendar colours`);
    if (w >= 1440) ok(c.heroB <= c.barT, `E20 ${tag}: the whole result card is above the bottom bar (${c.heroB} / ${c.barT})`);
    ok(await p.evaluate(() => document.documentElement.lang) === lang, `E34 ${tag}: html lang`);
    const wide = await p.evaluate(() => [...document.querySelectorAll('main *, .wbar *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !e.closest('.tbl, .leaflet-pane, .ex, #spChart'); }).length);
    ok(wide === 0, `E35 ${tag}: ${wide} elements stick out of the screen`);
    if (w < 800) { // phone: the bottom bar stays on screen and never covers the end of the page
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(100);
      const bb = await p.evaluate(() => { const b = document.getElementById('wbar').getBoundingClientRect(), f = document.querySelector('.foot').getBoundingClientRect(); return { pos: getComputedStyle(document.getElementById('wbar')).position, barTop: Math.round(b.top), barBottom: Math.round(b.bottom), footBottom: Math.round(f.bottom), vh: innerHeight }; });
      ok(bb.pos === 'fixed' && bb.barBottom === bb.vh && bb.footBottom <= bb.barTop + 1, `E35 ${tag}: bottom bar fixed and not covering the page end ${JSON.stringify(bb)}`);
    }
    if (lang === 'en') console.log(tag, 'page height on step 3', await p.evaluate(() => document.documentElement.scrollHeight));
    errs.push(...errors.map(e => tag + ' ' + e)); await ctx.close();
  }
  // 2. four example fields, 2050, prices, limits, terms, share link (desktop, English)
  let { ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' }); await p.goto(APP); await ready(p);
  for (const k of ['borde', 'gaeu', 'thrace', 'heilbronn']) {
    await go(p, 1); await p.click(`[data-site="${k}"]`); await p.waitForTimeout(200); await ready(p); await go(p, 3);
    const s = await snap(p), c = await cards(p);
    console.log(k, '|', s.head, '|', s.strat.map(x => `${x.role}:${x.rot} ${x.mean}/${x.p10}`).join(' ; '));
    ok(c.strat === 3 && s.strat[0].role === 'mine', `E04 ${k}: three strategies, the first is the farmer's own`);
    ok(s.strat.every(x => x.mean > -800 && x.mean < 2500 && x.p10 <= x.mean + 1 && x.bare >= 0 && x.bare <= 12 && x.water >= 0 && x.water < 600), `E04 ${k}: numbers plausible ${JSON.stringify(s.strat)}`);
    // the result card shows the model's own numbers
    const hero = await p.evaluate(() => { const R = lastResults, b = R.best, m = R.me; return { big: document.querySelector('#ansHero .big').textContent.replace(/\D/g, ''), mean: String(Math.round(Math.abs(b.mean))),
      delta: document.querySelector('#ansHero .delta') ? document.querySelector('#ansHero .delta').textContent : '', d: Math.round(Math.abs(b.mean - m.mean)), more: b.mean >= m.mean, same: b === m,
      note: document.querySelector('.bsnote').textContent, bareD: m.bare - pickStrategies(R)[1].r.bare,
      vals: [...document.querySelectorAll('.strat .val')].map(v => v.textContent.replace(/\D/g, '')).join(), means: pickStrategies(R).map(s => Math.round(Math.abs(s.r.mean))).join() }; });
    ok(hero.big === hero.mean && hero.vals === hero.means, `E20 ${k}: result card and option cards show the model's profit ${JSON.stringify(hero)}`);
    ok(hero.same ? hero.delta === '' : hero.delta.replace(/\D/g, '').includes(String(hero.d)) && hero.delta.includes(hero.more ? 'more' : 'less'), `E20 ${k}: the difference to your rotation follows the real numbers (${hero.delta})`);
    ok(Math.abs(hero.bareD) < 0.25 ? /about as long/.test(hero.note) : hero.note.includes(hero.bareD > 0 ? 'less' : 'more'), `E20 ${k}: bare soil wording follows the real values (${hero.note}, ${hero.bareD.toFixed(2)})`);
    ok(!(await p.evaluate(() => document.getElementById('space').hidden)) && (await p.evaluate(() => document.getElementById('spMonths').textContent.length > 20)), `E04 E23 ${k}: satellite panel with bare months`);
    if (k === 'thrace') ok(await p.evaluate(() => document.querySelector('.strat.s0').textContent.includes('Turkish prices')), 'E04 thrace: price gap named in the card');
  }
  const base = await snap(p);
  await go(p, 2);
  for (const sc of ['ssp245', 'ssp585', 'now']) { await p.click(`#s2 [data-scen="${sc}"]`); await ready(p); const s = await snap(p);
    console.log(sc, '|', await p.evaluate(() => document.getElementById('fcScen').textContent), '|', s.strat.map(x => x.mean).join('/'));
    if (sc !== 'now') ok(JSON.stringify(s.strat) !== JSON.stringify(base.strat), 'E15 ' + sc + ': numbers change'); else ok(JSON.stringify(s.strat) === JSON.stringify(base.strat), 'E15 back to today: same numbers as before (deterministic)'); }
  await p.click('#moreOpts summary');   // prices sit inside the closed "More options" fold
  for (const pm of ['fixed', 'y2022', 'y2026', 'hist']) { await p.selectOption('#priceMode', pm); await ready(p); console.log('prices', pm, (await snap(p)).strat.map(x => x.mean).join('/')); }
  // limits: no sugar beet, cannot sell rapeseed, no forage use
  await p.click('#limits summary'); await p.check('#eqBeet'); await ready(p);
  await p.evaluate(() => document.querySelector('#noSell input[value="rapeseed"]').click()); await ready(p);
  let s = await snap(p);
  ok(!s.all.some(x => /sugarbeet|rapeseed/.test(x)), 'E17 limits: sugar beet and rapeseed rotations are left out');
  ok(await p.evaluate(() => /sugar beet/.test(document.getElementById('answer').textContent) && document.getElementById('limNote').textContent.length > 10), 'E17 limits: the page says what was left out');
  const vetch1 = await p.evaluate(() => lastResults.rots.find(r => r.seq.join() === 'maize,wheat,vetch').mean);
  await p.uncheck('#forage'); await ready(p);
  const vetch0 = await p.evaluate(() => lastResults.rots.find(r => r.seq.join() === 'maize,wheat,vetch').mean);
  ok(vetch0 < vetch1 - 50, `E17 limits: without a forage buyer vetch earns less (${Math.round(vetch1)} to ${Math.round(vetch0)})`);
  await p.evaluate(() => { document.getElementById('slot0').value = 'rapeseed'; document.getElementById('slot0').onchange(); }); await ready(p);
  ok(await p.evaluate(() => /step 2/.test(document.querySelector('.strat.s0').textContent)), 'E17 limits: own rotation with an excluded crop is flagged');
  ok(await p.evaluate(() => !document.getElementById('slotsBox').hidden && document.querySelector('#rotChips .rchip.other').getAttribute('aria-pressed') === 'true'), 'E13 a changed select presses "Something else"');
  await p.check('#eqRow'); await ready(p);
  await p.evaluate(() => { document.querySelectorAll('#noSell input').forEach(i => { if (!i.checked) i.click(); }); }); await ready(p);
  ok(await p.evaluate(() => document.querySelectorAll('.strat').length >= 1 && document.querySelector('#answer h2') !== null), 'E17 limits: page still works when every ready-made rotation is excluded');
  await p.evaluate(() => { document.querySelectorAll('#noSell input').forEach(i => { if (i.checked && i.value !== 'rapeseed') i.click(); }); }); await p.uncheck('#eqRow'); await ready(p);
  await p.evaluate(() => { const e = document.getElementById('irr'); e.value = 100; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change')); }); await ready(p);
  ok(await p.evaluate(() => lastResults.me.irr > 1 && /pump/.test(document.getElementById('answer').textContent) && document.getElementById('irr').style.getPropertyValue('--p') === '40%'), 'E19 irrigation: used, a local check on water right is listed, slider filled');
  await go(p, 3); await p.click('[data-term="et"]'); ok(await p.evaluate(() => document.getElementById('termBox').textContent.length > 80), 'E41 terms: explanation opens in place');
  const hash = await p.evaluate(() => stateHash()); const before = await snap(p); console.log('hash', hash);
  ok(/[#&]step=3/.test(hash) && /[#&]step=3/.test(await p.evaluate(() => location.hash)), 'E02 E03 the address carries the step');
  errs.push(...errors); await ctx.close();
  ({ ctx, p, errors } = await open(browser, 1440, 900, {})); await p.goto(APP + hash.replace('lang=en', 'lang=de')); await ready(p);
  const after = await snap(p);
  ok(await step(p) === 3, 'E29 E03 share link opens straight on the plan');
  ok(JSON.stringify(after.strat) === JSON.stringify(before.strat), 'E29 share link: same numbers in a new tab ' + JSON.stringify([before.strat.map(x => x.mean), after.strat.map(x => x.mean)]));
  ok(await p.evaluate(() => document.documentElement.lang === 'de' && document.getElementById('eqBeet').checked && !document.getElementById('forage').checked && document.querySelector('#noSell input[value="rapeseed"]').checked), 'E29 E34 share link: language and limits restored');
  // own field (Europe) and a field outside the CMIP6 grid
  await p.evaluate(() => chooseSite({ key: 'custom', lat: 48.3, lon: 12.1 })); await p.waitForTimeout(200); await ready(p);
  ok(await p.evaluate(() => document.getElementById('space').hidden && getComputedStyle(document.getElementById('space')).display === 'none' && document.getElementById('regionNote').hidden && document.querySelectorAll('.strat').length === 3 && document.querySelectorAll('#ansRest a.tile').length === 2), 'E05 own field: result without satellite panel and region note, two evidence links');
  ok(await p.evaluate(() => document.querySelector('.strat.s0').textContent.includes('Satellitengeschichte')), 'E05 own field: missing satellite history named as a gap');
  await p.evaluate(() => chooseSite({ key: 'custom', lat: 41.0, lon: -95.0 })); await p.waitForTimeout(200); await ready(p);
  await p.click('.fieldcard [data-scen="ssp245"]'); await ready(p);
  ok(await p.evaluate(() => lastResults.shift.mode === '2050' && document.querySelector('#s2 [data-scen="ssp245"]').getAttribute('aria-pressed') === 'true'), 'E15 outside Europe: 2050 falls back to the trend; both climate switches agree');
  ok(await p.evaluate(() => document.querySelectorAll('#termList dt').length === 14 && document.querySelectorAll('#glossList dt').length >= 18 && document.querySelectorAll('#resBody tr').length === 7 && document.querySelectorAll('.judge li').length === 5), 'E41 glossary terms, data table and judgement list are filled');
  await p.click('#ground summary'); await p.click('#openOwn'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('moreOpts').open && +document.body.dataset.step === 2), 'E41 E18 ground: button opens the rain and soil inputs in step 2');
  // layer thumbnails: real pictures of each layer, the NASA ones from GIBS
  await go(p, 1);
  for (const k of ['ndvi', 'smap', 'tc', 'esri']) { await p.click(`#lyBox [data-ly="${k}"]`); await p.waitForTimeout(200);
    const L = await p.evaluate(k => ({ cur: curLayer, pressed: document.querySelector(`#lyBox [data-ly="${k}"]`).getAttribute('aria-pressed'), note: !document.getElementById('lyNote').hidden, bg: getComputedStyle(document.querySelector(`#lyBox [data-ly="${k}"] i`)).backgroundImage, tiles: [...document.querySelectorAll('#heroMap img.leaflet-tile')].map(i => i.src.includes('gibs') ? 'gibs' : 'esri') }), k);
    ok(L.cur === k && L.pressed === 'true' && L.note === (k !== 'esri') && (k === 'esri' ? /arcgisonline/.test(L.bg) : /gibs\.earthdata/.test(L.bg)) && (k === 'esri' ? !L.tiles.includes('gibs') : L.tiles.includes('gibs')), `E10 layer ${k}: thumbnail, map tiles and note ${JSON.stringify(Object.assign({}, L, { bg: L.bg.slice(0, 60), tiles: [...new Set(L.tiles)] }))}`); }
  await go(p, 3); await p.evaluate(() => { window.print = () => {}; printReport(); }); ok(await p.evaluate(() => document.getElementById('report').querySelectorAll('.strat').length === 3 && !!document.querySelector('#report .hero h2')), 'E26 report: contains the result card and the option cards');
  errs.push(...errors); await ctx.close();
  // 3. steps: header, Next and Back, browser Back, deep links
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' })); await p.goto(APP); await ready(p);
  ok(await p.evaluate(() => [...document.querySelectorAll('details.xpd, details.sect, details.fold, details.evmore, #limits, #moreOpts')].every(d => !d.open)), 'E02 folds are closed by default');
  ok(await p.evaluate(() => document.getElementById('prevBtn').hidden && document.getElementById('nextT').textContent === 'Next: your crops' && document.querySelector('#stepper li.cur [data-go="1"]').getAttribute('aria-current') === 'step'), 'E02 step 1: no Back button, Next names step 2, header marks step 1');
  await p.click('#stepper [data-go="3"]'); await p.waitForTimeout(200);
  ok(await step(p) === 3 && await p.evaluate(() => document.querySelectorAll('#stepper li.done').length === 2 && document.getElementById('nextT').textContent === 'Save or print my plan' && !document.getElementById('prevBtn').hidden), 'E02 header: step 3 directly, earlier steps ticked');
  await p.click('#prevBtn'); await p.waitForTimeout(150); ok(await step(p) === 2 && /step=2/.test(await p.evaluate(() => location.hash)), 'E02 Back goes to step 2 and the address follows');
  await p.goBack(); await p.waitForTimeout(250); ok(await step(p) === 3, 'E02 browser Back returns to step 3');
  await p.goBack(); await p.waitForTimeout(250); ok(await step(p) === 1, 'E02 browser Back again returns to step 1');
  await p.goForward(); await p.waitForTimeout(250); ok(await step(p) === 3, 'E02 browser Forward');
  await p.click('.bpill.c2'); await p.waitForTimeout(150); ok(await step(p) === 2, 'E02 bottom bar: the crops pill opens step 2');
  await p.click('.bpill.c1'); await p.waitForTimeout(150); ok(await step(p) === 1, 'E02 bottom bar: the field pill opens step 1');
  await go(p, 3); await p.click('.fieldcard [data-go="1"]'); await p.waitForTimeout(150); ok(await step(p) === 1, 'E02 plan: "change field" goes back to step 1');
  // rotation chips
  await go(p, 2);
  ok(await p.evaluate(() => document.querySelectorAll('#rotChips .rchip').length >= 4 && document.getElementById('slotsBox').hidden && getComputedStyle(document.getElementById('slotsBox')).display === 'none' && /years?/.test(document.querySelector('#rotChips .rchip .meta').textContent)), 'E12 chips: shown with their length, selects hidden by default');
  ok(await p.evaluate(() => userSeq().join('.') === document.querySelector('#rotChips .rchip[aria-pressed="true"]').dataset.rot && document.getElementById('bpCrops').textContent === chipLabel(userSeq())), 'E12 chips: the default rotation is pressed and named in the bottom bar');
  ok(await p.evaluate(() => !document.getElementById('runBtn') && document.getElementById('moreOpts').contains(document.getElementById('priceMode')) && document.getElementById('myPest').textContent.length > 10), 'E12 E14 E18 no results button; prices inside "More options"; crop-break note');
  await p.click('#rotChips .rchip.other'); ok(await p.evaluate(() => !document.getElementById('slotsBox').hidden), 'E13 chips: "something else" shows the selects');
  await p.click('#rotChips .rchip:nth-child(2)'); await ready(p);
  ok(await p.evaluate(() => document.getElementById('slotsBox').hidden && userSeq().join('.') === document.querySelector('#rotChips .rchip[aria-pressed="true"]').dataset.rot && lastResults.me.seq.join('.') === userSeq().join('.') && document.getElementById('bpCrops').textContent === chipLabel(userSeq())), 'E12 chips: tap sets the rotation, recalculates, and the bottom bar follows');
  const r0 = await p.evaluate(() => userSeq().join('.'));
  await go(p, 1); await p.click('[data-site="thrace"]'); await p.waitForTimeout(200); await ready(p);
  ok(await p.evaluate(r => userSeq().join('.') === r, r0), 'E12 chips: the chosen rotation is kept when the field changes');
  // priorities and the region note
  await go(p, 2);
  await p.evaluate(() => { const e = document.getElementById('wWater'); e.value = 5; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change')); }); await ready(p);
  ok(await p.evaluate(() => /water 36%/.test(document.getElementById('wSum').textContent) && document.getElementById('wWaterV').textContent === 'most important' && lastResults.w.water === 5), 'E16 priorities: slider changes the weights and the result');
  await p.click('#regionNote summary'); await p.click('#rnBtn'); await ready(p);
  ok(await p.evaluate(() => document.getElementById('wRisk').value === '5' && /region\.html\?r=thrace/.test(document.getElementById('rnMore').href)), 'E16 E40 region note: suggested priorities and the region page link');
  // evidence
  await go(p, 3);
  ok(await p.evaluate(() => document.getElementById('evWarm').textContent.includes('°C') && !document.getElementById('climate').hidden && !document.getElementById('space').hidden), 'E23 evidence: warming number and boxes');
  ok(await p.evaluate(() => { const a = document.getElementById('answer').getBoundingClientRect(), e = document.getElementById('evidence').getBoundingClientRect(); return e.top >= a.bottom - 1; }), 'E23 evidence: section follows the plan');
  await p.click('#ansRest a.tile[href="#trust"]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => { const r = document.getElementById('trust').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && /lat=/.test(location.hash); }), 'E23 evidence: tile scrolls to the back-test, the address keeps its state');
  await go(p, 1); await p.click('.hlinks a[href="#glossary"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#glossary details.sect').open && +document.body.dataset.step === 3), 'E41 header link opens the words section on the plan step');
  await go(p, 2); await p.click('.foot a[href="#fields"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#fields details.sect').open && +document.body.dataset.step === 3), 'E41 footer link opens My fields');
  errs.push(...errors); await ctx.close();
  // deep links: a step in the address
  for (const [h, st] of [['#lat=49.1577&lon=9.109&site=heilbronn&rot=wheat.barley&lang=en&step=2', 2], ['#lat=49.1577&lon=9.109&site=heilbronn&rot=wheat.barley&lang=en&step=1', 1], ['#lat=49.1577&lon=9.109&site=heilbronn&rot=wheat.barley&lang=en&sc=ssp245&step=3', 3]]) {
    ({ ctx, p, errors } = await open(browser, 390, 844, {})); await p.goto(APP + h); await ready(p);
    ok(await step(p) === st && await visible(p, '#s' + st), `E03 deep link opens step ${st}`);
    if (st === 3) ok(await p.evaluate(() => lastResults.shift.mode === 'ssp245' && document.querySelector('.fieldcard [data-scen="ssp245"]').getAttribute('aria-pressed') === 'true'), 'E03 E15 deep link: climate restored');
    errs.push(...errors); await ctx.close();
  }
  ({ ctx, p, errors } = await open(browser, 1440, 900, {})); await p.goto(APP + '#lat=49.1577&lon=9.109&site=heilbronn&rot=wheat.chickpea.maize&lang=en&pm=fixed'); await ready(p);
  ok(await step(p) === 3 && await p.evaluate(() => userSeq().join('.') === 'wheat.chickpea.maize' && !document.getElementById('slotsBox').hidden && document.querySelector('#rotChips .rchip.other').getAttribute('aria-pressed') === 'true' && document.getElementById('moreOpts').open), 'E03 E13 old share link without a step: opens the plan; unusual rotation shows the selects; options open');
  errs.push(...errors); await ctx.close();
  // 4. climate switch and the address
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'tr' })); await p.goto(APP); await ready(p);
  const sw0 = await snap(p); await go(p, 2);
  await p.click('#s2 [data-scen="ssp245"]'); await ready(p);
  ok(await p.evaluate(() => lastResults.shift.mode === 'ssp245' && /sc=ssp245/.test(location.hash) && document.querySelector('.fieldcard [data-scen="ssp245"]').getAttribute('aria-pressed') === 'true' && /SSP2-4\.5/.test(document.getElementById('scDesc').textContent) && document.getElementById('bpClim').textContent === '2050 orta'), 'E15 switch: 2050 middle changes the scenario, the description, the bottom bar and the address');
  ok(JSON.stringify((await snap(p)).strat) !== JSON.stringify(sw0.strat), 'E15 switch: numbers change with the climate');
  await p.click('#s2 [data-scen="ssp585"]'); await ready(p);
  await p.reload(); await ready(p);
  ok(await p.evaluate(() => scen === 'ssp585' && lastResults.shift.mode === 'ssp585' && +document.body.dataset.step === 2), 'E15 switch: reload keeps 2050 high and the step');
  await p.click('#s2 [data-scen="now"]'); await ready(p);
  ok(JSON.stringify((await snap(p)).strat) === JSON.stringify(sw0.strat), 'E15 switch: back to today gives the first numbers');
  // 5. map: pick a field with a click, the data loads at once
  await go(p, 1); await p.waitForTimeout(200);
  let mb = await p.evaluate(() => document.getElementById('heroMap').getBoundingClientRect().toJSON());
  await p.mouse.click(mb.x + 120, mb.y + mb.height - 140); await p.waitForSelector('#pickBtn', { timeout: 5000 }); await p.click('#pickBtn');
  ok(await p.evaluate(() => site.key === 'custom' && !lastResults && !document.getElementById('ldDot').hidden && +document.body.dataset.step === 1), 'E05 map pick: field chosen, NASA data loading in the background while still on step 1');
  await ready(p);
  ok(await p.evaluate(() => !document.getElementById('ownField').hidden && /\d/.test(document.getElementById('fieldName').textContent) && document.getElementById('ldDot').hidden && document.querySelectorAll('#sites .site[aria-pressed="true"]').length === 0), 'E05 map pick: result ready, own field named, no example pressed');
  // 6. search with suggestions and the keyboard
  await p.click('#s1 .intro'); await p.keyboard.press('/');
  ok(await p.evaluate(() => document.activeElement.id === 'srchQ' && document.getElementById('search').classList.contains('open') && document.querySelectorAll('#sbl .sb-o.f').length === 4), 'E06 "/" focuses the search and lists the example fields');
  await p.keyboard.type('Straub'); await p.waitForSelector('#sbl .sb-o:not(.f)', { timeout: 5000 });
  const sg = await p.evaluate(() => ({ pl: document.querySelectorAll('#sbl .sb-o:not(.f)').length, ex: [...document.querySelectorAll('#sbl .sb-o.f .t')].map(e => e.textContent), mark: document.querySelector('#sbl .sb-o .t mark').textContent, km: document.querySelector('#sbl .sb-o .km').textContent, sel: document.querySelector('#sbl [aria-selected="true"]').dataset.i, ad: document.getElementById('srchQ').getAttribute('aria-activedescendant') }));
  ok(sg.pl === 2 && sg.ex.length === 1 && /Gäuboden/.test(sg.ex[0]) && sg.mark === 'Straub' && /km/.test(sg.km) && sg.sel === '0' && sg.ad === 'sbo0', 'E06 search: places and a matching example field, highlighted match, distance ' + JSON.stringify(sg));
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowUp');
  ok(await p.evaluate(() => document.querySelector('#sbl [aria-selected="true"]').dataset.i === '1' && document.getElementById('srchQ').getAttribute('aria-activedescendant') === 'sbo1'), 'E07 search: arrow keys move the choice');
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('Enter'); await p.waitForTimeout(1600);
  ok(await p.evaluate(() => Math.abs(heroMap.getCenter().lat - 48.88) < 0.05 && !document.getElementById('search').classList.contains('open') && !document.getElementById('mapHint').hidden && site.key === 'custom'), 'E07 search: Enter flies to the place and asks for a tap on the field');
  await p.fill('#srchQ', 'xyzq'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => /xyzq/.test(document.getElementById('sbl').textContent) && !document.querySelector('#sbl .sb-o')), 'E07 search: nothing found is said');
  await p.keyboard.press('Escape'); ok(await p.evaluate(() => !document.getElementById('search').classList.contains('open')), 'E07 search: Esc closes the list');
  await p.fill('#srchQ', 'Thra'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.querySelectorAll('#sbl .sb-o').length === 1 && document.querySelector('#sbl .sb-o.f')), 'E06 search: example field found by name');
  await p.keyboard.press('Enter'); await p.waitForTimeout(200); await ready(p);
  ok(await p.evaluate(() => site.key === 'thrace' && document.querySelector('[data-site="thrace"]').getAttribute('aria-pressed') === 'true'), 'E07 search: Enter on an example field chooses it');
  await p.click('#zIn'); await p.waitForTimeout(400); const z1 = await p.evaluate(() => heroMap.getZoom()); await p.click('#backBtn'); await p.waitForTimeout(200);
  ok(z1 > 15 && await p.evaluate(() => heroMap.getZoom() === 15 && heroMap.getBounds().contains([site.lat, site.lon])), 'E09 map buttons: zoom in and back to the field');
  errs.push(...errors); await ctx.close();
  // phone: map pick and search
  for (const [w, h, lang] of [[390, 844, 'tr'], [320, 640, 'de']]) {
    ({ ctx, p, errors } = await open(browser, w, h, { lang })); await p.goto(APP); await ready(p);
    mb = await p.evaluate(() => { const r = document.getElementById('heroMap').getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height }; });
    await p.evaluate(y => scrollTo(0, y - 20), mb.y); const sy = await p.evaluate(() => scrollY);
    await p.mouse.click(mb.x + mb.w - 70, mb.y - sy + 140); await p.waitForSelector('#pickBtn', { timeout: 5000 }); await p.click('#pickBtn'); await p.waitForTimeout(200); await ready(p);
    ok(await p.evaluate(() => site.key === 'custom'), `E05 E35 ${lang} ${w}px: a field picked on the map`);
    await p.click('#srchQ'); await p.keyboard.type('Straubing'); await p.waitForSelector('#sbl .sb-o:not(.f)', { timeout: 5000 });
    ok(await overflow(p) <= 1 && await p.evaluate(() => { const d = document.getElementById('sbl').getBoundingClientRect(); return d.right <= innerWidth && d.left >= 0; }), `E06 E35 ${lang} ${w}px: suggestion list fits the screen`);
    await p.keyboard.press('Escape'); await p.click('[data-site="gaeu"]'); await p.waitForTimeout(200); await ready(p);
    ok(await p.evaluate(() => site.key === 'gaeu'), `E04 E35 ${lang} ${w}px: example field chosen from the swipe row`);
    errs.push(...errors); await ctx.close();
  }
  // 7. My fields on a phone
  ({ ctx, p, errors } = await open(browser, 390, 844, { lang: 'tr' })); await p.goto(APP); await ready(p); await go(p, 3);
  await p.click('#fields summary'); await p.fill('#fName', 'Ev tarlası'); await p.fill('#fHa', '12'); await p.click('#fForm button[type=submit]');
  await p.fill('#fName', 'Straubing'); await p.fill('#fPlace', 'Straubing'); await p.fill('#fHa', '8'); await p.click('#fForm button[type=submit]');
  await p.waitForFunction(() => FIELDS.length === 2 && FIELDS.every(f => FRES[f.id] && FRES[f.id].best), null, { timeout: 120000 });
  ok(await p.evaluate(() => /20/.test(document.getElementById('fTotal').textContent)), 'E30 my fields: two fields with a farm total');
  ok(await overflow(p) <= 1, 'E30 E35 my fields on a phone: no overflow');
  const flHash = await p.evaluate(async () => { let u = ''; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async v => { u = v; } }, configurable: true }); document.getElementById('fLink').click(); await new Promise(r => setTimeout(r, 50)); return u; });
  errs.push(...errors); await ctx.close();
  ({ ctx, p, errors } = await open(browser, 390, 844, {})); await p.goto(flHash); await p.waitForTimeout(500);
  ok(await p.evaluate(() => FIELDS.length === 2 && +document.body.dataset.step === 3 && document.querySelector('#fields details.sect').open), 'E33 my fields: a list link opens the list on the plan step');
  await p.waitForFunction(() => FIELDS.every(f => FRES[f.id] && FRES[f.id].best), null, { timeout: 120000 });
  await p.click('#fTable [data-open]'); await p.waitForTimeout(200); await ready(p);
  ok(await p.evaluate(() => +document.body.dataset.step === 3 && userSeq().join() === FIELDS[0].rot.join()), 'E31 my fields: open a field shows its plan');
  errs.push(...errors); await ctx.close();
  // 8. no Web Worker: same numbers from the main thread
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' })); await p.goto(APP); await ready(p); const withW = await snap(p); const wk = await p.evaluate(() => WORKER_OK && POOLS.main.ws.length); errs.push(...errors); await ctx.close();
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en', noWorker: true })); await p.goto(APP); await ready(p); const noW = await snap(p);
  ok(wk >= 1, 'E42 web worker runs from file:// (workers: ' + wk + ')');
  ok(await p.evaluate(() => WORKER_OK === false), 'E42 fallback: worker switched off in this run');
  ok(JSON.stringify(withW.strat) === JSON.stringify(noW.strat), 'E42 fallback: main thread gives the same numbers as the worker');
  errs.push(...errors); await ctx.close();
  // 9. NASA POWER fails once, the button retries
  let failNow = true; ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en', powerFail: () => failNow }));
  await p.goto(APP); await p.waitForFunction(() => document.querySelector('#status.err'), null, { timeout: 60000 });
  ok(await p.evaluate(() => document.getElementById('ldDot').hidden), 'E39 failed load: no endless loading sign');
  await go(p, 3); failNow = false; await p.click('#retryBtn'); await ready(p); ok(true, 'E39 retry'); await ctx.close();   // the console error of the failed request is expected here
  // 10. page stays responsive while calculating: a timer keeps firing during a run
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' })); await p.goto(APP); await ready(p);
  const gapMs = await p.evaluate(() => new Promise(res => { let last = performance.now(), worst = 0; const iv = setInterval(() => { const n = performance.now(); worst = Math.max(worst, n - last); last = n; }, 10);
    document.querySelector('[data-scen="ssp585"]').click(); const chk = setInterval(() => { const a = document.getElementById('answer'); if (!a.classList.contains('upd') && +a.dataset.done === runToken) { clearInterval(iv); clearInterval(chk); res(Math.round(worst)); } }, 20); }));
  console.log('longest main-thread pause during a run:', gapMs, 'ms'); ok(gapMs < 400, 'E42 main thread blocked for ' + gapMs + ' ms'); errs.push(...errors); await ctx.close();
  // 11. region page
  for (const r of ['heilbronn', 'borde', 'gaeu', 'thrace']) for (const lang of ['en', 'tr', 'de']) {
    ({ ctx, p, errors } = await open(browser, r === 'thrace' ? 390 : 1440, 900, {})); await p.goto(`${REGION}?r=${r}&lang=${lang}`); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.body.innerText.length > 1500 && !document.body.innerText.includes('—')), `E40 region ${r} ${lang}: filled`);
    ok(await p.evaluate(() => /index\.html#lat=/.test(document.getElementById('planLink').href)), `E40 region ${r} ${lang}: link back to the v2 planner`);
    ok(await overflow(p) <= 1, `E40 E35 region ${r} ${lang}: overflow`); errs.push(...errors); await ctx.close(); }
  console.log(`\nchecks: ${n}, failed: ${bad}`); console.log('ERRORS', errs.length, errs.slice(0, 10));
  await browser.close(); process.exit(bad || errs.length ? 1 : 0);
})();
