// Land check before a field is chosen (docs/E2E_CASES.md E43 to E47): NASA MODIS land cover (GIBS) and OpenStreetMap (Overpass),
// both answered by the fake in harness.js (farmland everywhere, buildings, water, forest, the sea and a spot where nothing answers).
// Every check name starts with its case ID. Screenshot (deviceScaleFactor 1): the warning on the map.
const { chromium, open, ready, APP, OUT, LAND, path } = require('./harness');
(async () => {
  const browser = await chromium.launch(); const errs = []; let bad = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
  // tap the map at a given point, as a user would
  const tapAt = async (p, [la, lo]) => {
    await p.evaluate(([la, lo]) => { heroMap.closePopup(); heroMap.setView([la, lo], 15, { animate: false }); }, [la, lo]);
    const pt = await p.evaluate(([la, lo]) => { const r = document.getElementById('heroMap').getBoundingClientRect(), c = heroMap.latLngToContainerPoint([la, lo]); return { x: r.left + c.x, y: r.top + c.y }; }, [la, lo]);
    await p.mouse.click(pt.x, pt.y); };
  const pop = p => p.evaluate(() => { const e = [...document.querySelectorAll('.leaflet-popup .pick')].pop(); return e ? { txt: e.innerText.replace(/\s+/g, ' '), box: (e.querySelector('.lcbox') || {}).className || '', pick: !!e.querySelector('#pickBtn'), other: !!e.querySelector('#lcOther'), any: !!e.querySelector('#lcAnyway') } : null; });
  // waits for the land box of the popup at this point (an old popup may still be fading out)
  const waitBox = (p, at) => p.waitForFunction(at => [...document.querySelectorAll('.leaflet-popup .pick')].some(e => e.querySelector('.lcbox') && e.querySelector('small').textContent === at[0].toFixed(3) + ', ' + at[1].toFixed(3)), at, { timeout: 8000 });

  // ---------- E43 farmland: OK, chosen ----------
  let { ctx, p, errors, calls } = await open(browser, 1440, 900, { lang: 'en' }); await p.goto(APP); await ready(p);
  await p.click('[data-site="borde"]'); await p.waitForTimeout(300); await ready(p);
  ok(calls.overpass === 0 && calls.landcover === 0, 'E43 example fields are not checked (no land check request)');
  const farm = [49.21, 9.31];
  await tapAt(p, farm); await waitBox(p, farm);
  let q = await pop(p);
  ok(q && /lv0/.test(q.box) && /Looks like farmland/.test(q.txt) && /OpenStreetMap/i.test(q.txt) && /NASA MODIS land cover 500 m/i.test(q.txt) && q.pick, 'E43 farmland: the popup says it looks like farmland and names both sources ' + JSON.stringify(q));
  await p.click('#pickBtn'); await p.waitForTimeout(200); await ready(p);
  ok(await p.evaluate(f => site.key === 'custom' && Math.abs(site.lat - f[0]) < 0.002 && !!lastResults, farm), 'E43 farmland: "Choose this field" chooses it and the plan is calculated');
  // ---------- E47 cache: the same spot again asks no service ----------
  const c0 = { o: calls.overpass, m: calls.landcover };
  await tapAt(p, farm); await waitBox(p, farm);
  ok(calls.overpass === c0.o && calls.landcover === c0.m && /Looks like farmland/.test((await pop(p)).txt), `E47 cache: the same spot is not checked again (Overpass ${calls.overpass}, MODIS ${calls.landcover})`);
  ok(await p.evaluate(() => LANDC.size >= 1 && LANDC.has('49.210,9.310')), 'E47 cache: results kept per point rounded to 3 decimals');

  // ---------- E44 buildings: warning, choose another spot, use it anyway ----------
  const before = await p.evaluate(() => [site.lat, site.lon]);
  await tapAt(p, LAND.bld.at); await waitBox(p, LAND.bld.at); q = await pop(p);
  ok(q && /lv1/.test(q.box) && /Looks like buildings here/.test(q.txt) && /buildings within 15 m/.test(q.txt) && /town or city/.test(q.txt) && !q.pick && q.other && q.any, 'E44 buildings: warning with both sources, "Choose another spot" and "Use it anyway" ' + JSON.stringify(q));
  ok(await p.evaluate(() => { const a = document.getElementById('lcOther'), b = document.getElementById('lcAnyway'); return getComputedStyle(a).backgroundColor !== getComputedStyle(b).backgroundColor && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING; }), 'E44 buildings: "Choose another spot" is the main button and comes first');
  await p.screenshot({ path: path.join(OUT, 'land_warn_map_1440x900.png') });
  await p.click('#lcOther'); await p.waitForTimeout(350);
  ok(await p.evaluate(b => !document.querySelector('.leaflet-popup #lcOther') && site.lat === b[0] && site.lon === b[1] && !document.getElementById('mapHint').hidden && document.getElementById('mapHint').textContent === t('lc_hint'), before), 'E44 buildings: "Choose another spot" closes the popup, keeps the field and asks for another tap');
  await tapAt(p, LAND.bld.at); await waitBox(p, LAND.bld.at); await p.click('#lcAnyway'); await p.waitForTimeout(200); await ready(p);
  ok(await p.evaluate(b => site.key === 'custom' && Math.abs(site.lat - b[0]) < 0.002 && Math.abs(site.lon - b[1]) < 0.002 && !!lastResults, LAND.bld.at), 'E44 buildings: "Use it anyway" chooses the spot and calculates');
  // forest: a warning too, without the word buildings
  await tapAt(p, LAND.forest.at); await waitBox(p, LAND.forest.at); q = await pop(p);
  ok(q && /lv1/.test(q.box) && /may not be farmland/.test(q.txt) && /forest/.test(q.txt) && q.any, 'E44 forest: warned as maybe not farmland ' + JSON.stringify(q));

  // ---------- E45 water: blocked ----------
  const cur = await p.evaluate(() => [site.lat, site.lon]);
  await tapAt(p, LAND.water.at); await waitBox(p, LAND.water.at); q = await pop(p);
  ok(q && /lv2/.test(q.box) && /water, not a field/.test(q.txt) && /lake, river/.test(q.txt) && /NASA MODIS land cover 500 m water/i.test(q.txt) && !q.pick && !q.any && q.other, 'E45 water: blocked, only "Choose another spot" ' + JSON.stringify(q));
  await tapAt(p, LAND.sea.at); await waitBox(p, LAND.sea.at); q = await pop(p);
  ok(q && /lv2/.test(q.box) && /probably the sea/.test(q.txt) && !q.any, 'E45 sea: no land mapped, blocked ' + JSON.stringify(q));
  await p.click('#lcOther');
  ok(await p.evaluate(c => site.lat === c[0] && site.lon === c[1], cur), 'E45 water: the field is not changed');
  // My fields form: a place in the water is refused, a place with buildings asks first
  await p.evaluate(() => go(3)); await p.click('#fields summary');
  await p.fill('#fName', 'Lake'); await p.fill('#fPlace', 'Seedorf'); await p.click('#fForm button[type=submit]');
  await p.waitForSelector('#fMsg .lcbox', { timeout: 8000 });
  ok(await p.evaluate(() => FIELDS.length === 0 && /water, not a field/.test(document.getElementById('fMsg').textContent)), 'E45 my fields: a place in the water is not added');
  errs.push(...errors); await ctx.close();

  // ---------- E46 services slow or down: the field is chosen without a warning ----------
  ({ ctx, p, errors, calls } = await open(browser, 390, 844, { lang: 'de' })); await p.goto(APP); await ready(p);
  await tapAt(p, LAND.slow.at); await p.waitForSelector('#pickBtn');
  ok(/Landbedeckung wird geprüft/.test((await pop(p)).txt), 'E46 timeout: the popup says the land cover is being checked');
  const t0 = Date.now(); await p.click('#pickBtn');
  await p.waitForFunction(at => site.key === 'custom' && Math.abs(site.lat - at[0]) < 0.002, LAND.slow.at, { timeout: 9000 }).catch(() => {});
  const ms = Date.now() - t0;
  ok(await p.evaluate(at => site.key === 'custom' && Math.abs(site.lat - at[0]) < 0.002, LAND.slow.at) && ms < 7000, `E46 timeout: no answer within 5 s, the field is chosen anyway (${ms} ms)`);
  ok(await p.evaluate(() => !document.querySelector('.lcbox.lv1, .lcbox.lv2') && !LANDC.has('50.000,10.000')), 'E46 timeout: nothing alarming shown, and the empty result is not kept');
  await ready(p); errs.push(...errors); await ctx.close();
  ({ ctx, p, errors, calls } = await open(browser, 1440, 900, { lang: 'tr', landFail: true })); await p.goto(APP); await ready(p);
  await tapAt(p, [49.3, 9.4]); await p.waitForSelector('#pickBtn'); await p.waitForTimeout(300); await p.click('#pickBtn'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => site.key === 'custom' && Math.abs(site.lat - 49.3) < 0.002 && !document.querySelector('.lcbox')), 'E46 services down: the field is chosen at once, no warning');
  await ready(p); errs.push(...errors.filter(e => !/Failed to load resource|ERR_FAILED/.test(e))); await ctx.close();

  // ---------- E44 on a phone: the warning fits ----------
  ({ ctx, p, errors } = await open(browser, 320, 640, { lang: 'tr' })); await p.goto(APP); await ready(p);
  await tapAt(p, LAND.bld.at); await waitBox(p, LAND.bld.at); await p.waitForTimeout(400);
  const fit = await p.evaluate(() => { const r = document.querySelector('.leaflet-popup-content-wrapper').getBoundingClientRect(), m = document.getElementById('mw').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, ml: m.left, mr: m.right, mt: m.top, mb: m.bottom, sw: document.documentElement.scrollWidth, any: document.getElementById('lcAnyway').textContent }; });
  ok(fit.l >= fit.ml - 1 && fit.r <= fit.mr + 1 && fit.t >= fit.mt - 1 && fit.b <= fit.mb + 1 && fit.sw <= 321 && /Yine de kullan/.test(fit.any), 'E44 phone 320 px (TR): the warning fits inside the map ' + JSON.stringify(fit));
  await p.screenshot({ path: path.join(OUT, 'land_warn_phone_320.png') });
  errs.push(...errors); await ctx.close();

  console.log(`checks: ${n}, failed: ${bad}`); console.log('ERRORS', errs.length, errs.slice(0, 10));
  await browser.close(); process.exit(bad || errs.length ? 1 : 0);
})();
