// End-to-end checks for the cases in docs/E2E_CASES.md that e2e_v2.js does not cover: my location, NASA layer error,
// crop break note, more options, charts, the save menu (print / PDF, plan as CSV, copy link), My fields remove and CSV,
// the language buttons, wide screens and the logo. Every check name starts with its case ID.
// Screenshots (deviceScaleFactor 1) go to ROTASAT_SHOTS: step 1 at 1920x1080 and 2560x1440, the save menu, the header logo.
const { chromium, open, ready, overflow, snap, APP, OUT, path, fs } = require('./harness');
(async () => {
  const browser = await chromium.launch(); const errs = []; let bad = 0, n = 0; const seen = new Set();
  const ok = (c, m) => { n++; seen.add(m.slice(0, 3)); if (!c) { bad++; console.log('FAIL', m); } };
  const go = (p, k) => p.evaluate(s => { go(s); }, k);
  const step = p => p.evaluate(() => +document.body.dataset.step);
  const nums = p => p.evaluate(() => JSON.stringify(lastResults.sorted.map(r => [r.seq.join('-'), Math.round(r.mean), Math.round(r.p10)])));
  const setVal = (p, id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
  const download = async (p, click) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), click()]); return { name: d.suggestedFilename(), raw: fs.readFileSync(await d.path()) }; };
  // a small CSV reader (quotes, doubled quotes, chosen separator)
  const parse = (txt, sep) => txt.replace(/^\ufeff/, '').split('\r\n').map(l => { const out = []; let f = '', q = false;
    for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { f += '"'; i++; } else if (ch === '"') q = false; else f += ch; }
      else if (ch === '"') q = true; else if (ch === sep) { out.push(f); f = ''; } else f += ch; }
    out.push(f); return out; });
  let ctx, p, errors;

  // ---------- E36 wide screens and E37 logo ----------
  for (const [w, h] of [[1440, 900], [1920, 1080], [2560, 1440]]) {
    ({ ctx, p, errors } = await open(browser, w, h, { lang: 'en' })); await p.goto(APP); await ready(p); await p.waitForTimeout(300);
    const L = await p.evaluate(() => { const r = e => document.querySelector(e).getBoundingClientRect(), s1 = r('#s1'), map = r('#mw'), lede = r('#s1 .lede'), lbl = r('#s1 .exl'),
      cards = [...document.querySelectorAll('#sites .site')].map(c => c.getBoundingClientRect()), intro = r('#s1 .intro');
      return { s1w: s1.width, s1l: s1.left, mapW: map.width, mapH: map.height, gap: lbl.top - lede.bottom, cardGap: cards[0].top - lbl.bottom, top: intro.top - s1.top, bottom: s1.bottom - cards[3].bottom, sideW: r('#s1 .side').width, vw: innerWidth }; });
    const tag = `${w}x${h}`;
    ok(L.s1w >= Math.min(w - 48, 2400) - 2, `E36 ${tag}: step 1 uses the screen width (${Math.round(L.s1w)} of ${w})`);
    ok(L.mapW >= 0.6 * w && L.mapH >= h - 68 - 76 - 60, `E36 ${tag}: large map ${Math.round(L.mapW)}x${Math.round(L.mapH)}`);
    ok(L.gap >= 0 && L.gap <= 60 && L.cardGap <= 24, `E36 ${tag}: example fields directly under the intro (gap ${Math.round(L.gap)} px)`);
    ok(L.top <= L.bottom + 2, `E36 ${tag}: intro and examples sit together, not pushed to the bottom (above ${Math.round(L.top)}, below ${Math.round(L.bottom)})`);
    ok(await overflow(p) <= 1, `E36 ${tag}: step 1 no overflow`);
    const logo = await p.evaluate(() => { const b = document.querySelector('.brand'), svg = b.querySelector('svg'), lw = b.querySelector('.lw'), sm = lw && lw.querySelector('small');
      const ico = document.querySelector('link[rel=icon]').getAttribute('href');
      return { arc: svg.innerHTML.includes('M34.6 13.5 A16 16 0 1 1 26.5 5.4') && svg.innerHTML.includes('#0050D8') && svg.innerHTML.includes('rotate(45 31.6 8.4)') && !!svg.querySelector('clipPath circle[r="12.5"]'),
        bg: getComputedStyle(b.querySelector('.lg')).backgroundColor, name: lw && lw.querySelector('b').textContent, line: sm && sm.textContent, lineVis: !!sm && sm.getBoundingClientRect().width > 0,
        hdr: getComputedStyle(document.querySelector('.hdr')).backgroundColor, fav: decodeURIComponent(ico).includes('M34.6 13.5 A16 16 0 1 1 26.5 5.4') && decodeURIComponent(ico).includes('#0050D8') }; });
    ok(logo.arc && logo.bg === 'rgba(0, 0, 0, 0)' && logo.name === 'RotaSat' && logo.line === 'CROP ROTATION FROM ORBIT' && logo.lineVis && logo.hdr === 'rgb(21, 22, 34)', `E37 ${tag}: old round logo with name and line on the dark header ${JSON.stringify(logo)}`);
    ok(logo.fav, `E37 ${tag}: favicon is the same round mark`);
    if (w === 1920 || w === 2560) await p.screenshot({ path: path.join(OUT, `step1_${tag}.png`) });
    if (w === 1920) await p.screenshot({ path: path.join(OUT, 'header_logo.png'), clip: { x: 0, y: 0, width: 420, height: 68 } });
    await p.click('#nextBtn'); await p.waitForTimeout(250);
    const s2 = await p.evaluate(() => document.getElementById('s2').getBoundingClientRect().width);
    ok(await overflow(p) <= 1 && s2 >= Math.min(w - 48, w >= 1700 ? 1560 : 1320) - 2, `E36 ${tag}: step 2 width ${Math.round(s2)}, no overflow`);
    await p.click('#nextBtn'); await p.waitForTimeout(300);
    const s3 = await p.evaluate(() => document.getElementById('s3').getBoundingClientRect().width);
    ok(await overflow(p) <= 1 && s3 >= Math.min(w - 48, w >= 1700 ? 1560 : 1320) - 2, `E36 ${tag}: step 3 width ${Math.round(s3)}, no overflow`);
    errs.push(...errors.map(e => tag + ' ' + e)); await ctx.close();
  }

  // the header with the logo, the steps and the languages fits between the phone layout and the wide screens
  for (const w of [821, 1000, 1241]) {
    ({ ctx, p, errors } = await open(browser, w, 800, { lang: 'de' })); await p.goto(APP); await ready(p);
    const hd = await p.evaluate(() => { const r = e => document.querySelector(e).getBoundingClientRect(); return { brand: r('.brand').right, st: r('.stepper').left, ste: r('.stepper').right, hr: r('.hright').left }; });
    ok(await overflow(p) <= 1 && hd.brand <= hd.st && hd.ste <= hd.hr, `E36 E37 ${w}px: header items do not overlap ${JSON.stringify(hd)}`);
    errs.push(...errors); await ctx.close();
  }
  // ---------- E27 save menu, E26 print, E28 plan CSV, E29 copy link (desktop, English) ----------
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' })); await p.goto(APP); await ready(p);
  await p.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
  await go(p, 3);
  ok(await p.evaluate(() => document.getElementById('nextBtn').getAttribute('aria-haspopup') === 'menu' && document.getElementById('saveMenu').hidden), 'E27 save menu: Next on step 3 announces a menu, closed at first');
  await p.click('#nextBtn'); await p.waitForTimeout(150);
  const m1 = await p.evaluate(() => ({ open: !document.getElementById('saveMenu').hidden, exp: document.getElementById('nextBtn').getAttribute('aria-expanded'), printed: window.__printed,
    items: [...document.querySelectorAll('#saveMenu [role=menuitem] b')].map(b => b.textContent), focus: document.activeElement.dataset.save,
    fits: (() => { const r = document.getElementById('saveMenu').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0; })() }));
  ok(m1.open && m1.exp === 'true' && m1.printed === 0 && m1.focus === 'print' && m1.fits, `E27 save menu: opens without printing, focus on the first choice ${JSON.stringify(m1)}`);
  ok(JSON.stringify(m1.items) === JSON.stringify(['Print or save as PDF', 'Download as spreadsheet (CSV)', 'Copy link']), 'E27 save menu: three choices ' + JSON.stringify(m1.items));
  await p.screenshot({ path: path.join(OUT, 'step3_save_menu_1440x900.png') });
  await p.keyboard.press('ArrowDown'); ok(await p.evaluate(() => document.activeElement.dataset.save === 'csv'), 'E27 save menu: Arrow Down moves to the next choice');
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); ok(await p.evaluate(() => document.activeElement.dataset.save === 'link'), 'E27 save menu: Arrow Up wraps around');
  await p.keyboard.press('Escape'); ok(await p.evaluate(() => document.getElementById('saveMenu').hidden && document.activeElement.id === 'nextBtn' && document.getElementById('nextBtn').getAttribute('aria-expanded') === 'false'), 'E27 save menu: Esc closes and gives focus back');
  await p.click('#nextBtn'); await p.mouse.click(300, 500); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.getElementById('saveMenu').hidden), 'E27 save menu: a click outside closes it');
  await p.click('#nextBtn'); await p.click('[data-save="print"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => window.__printed === 1 && document.getElementById('saveMenu').hidden && document.querySelectorAll('#report .strat').length === 3 && !!document.querySelector('#report .hero h2')), 'E26 print or save as PDF: report built and print dialog called');
  // plan CSV
  await p.click('#nextBtn');
  const c1 = await download(p, () => p.click('[data-save="csv"]'));
  const txt = c1.raw.toString('utf8'), lines = txt.replace(/^\ufeff/, '').split('\r\n');
  const R = await p.evaluate(() => ({ n: lastResults.sorted.length, rows: lastResults.sorted.map(r => [Math.round(r.score), Math.round(r.mean), Math.round(r.p10), Math.round(r.dC * 10) / 10, Math.round(r.bare * 10) / 10, Math.round(r.water)]),
    me: lastResults.sorted.indexOf(lastResults.me), roles: pickStrategies(lastResults).map(s => lastResults.sorted.indexOf(s.r)), lat: site.lat }));
  ok(c1.name === 'rotasat-plan-heilbronn.csv' && c1.raw[0] === 0xEF && c1.raw[1] === 0xBB && c1.raw[2] === 0xBF, `E28 plan CSV: file name and UTF-8 BOM (${c1.name})`);
  const hi = lines.findIndex(l => l.startsWith('"Option"'));
  ok(lines[0] === '"RotaSat plan"' && lines.some(l => l === '"Field","Heilbronn farmland"') && lines.some(l => l === `"Latitude",${R.lat}`) && lines.some(l => /^"Climate and prices","Today/.test(l)) && lines.some(l => /^"Your priorities","Weights now: profit \d+%/.test(l)), 'E28 plan CSV: field, coordinates, scenario and priorities on top');
  const data = parse(lines.slice(hi + 1).filter(Boolean).join('\r\n'), ',');
  ok(hi > 0 && data.length === R.n && data.every(r => r.length === 11), `E28 plan CSV: one row per tested rotation (${data.length} of ${R.n}), 11 columns`);
  ok(data.every((r, i) => JSON.stringify(r.slice(4, 10).map(Number)) === JSON.stringify(R.rows[i])), 'E28 plan CSV: fit score, profit, bad-year profit, carbon, bare months and water equal the model');
  ok(R.roles.every((k, j) => data[k][0].startsWith('ABC'[j] + ':')) && data.filter(r => r[0]).length === 3 && data[R.me][3] === '*', 'E28 plan CSV: A, B, C marked and your rotation starred');
  ok(data.every(r => r[10].length > 5) && data.some(r => /long enough/i.test(r[10])), 'E28 plan CSV: crop-break note in every row');
  ok(await p.evaluate(() => /rotasat-plan-heilbronn\.csv/.test(document.getElementById('saveDone').textContent)), 'E28 plan CSV: the menu says what was saved');
  // copy link
  const url = await p.evaluate(async () => { let u = ''; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async v => { u = v; } }, configurable: true });
    document.querySelector('[data-save="link"]').click(); await new Promise(r => setTimeout(r, 80)); return u; });
  ok(/#lat=.*step=3/.test(url) && await p.evaluate(() => document.getElementById('saveDone').textContent === 'Link copied'), 'E29 copy link: link with the plan copied, the menu says so');
  await go(p, 2); ok(await p.evaluate(() => document.getElementById('saveMenu').hidden && !document.getElementById('nextBtn').hasAttribute('aria-haspopup')), 'E27 save menu: closed and gone on other steps');
  const before = await nums(p); errs.push(...errors); await ctx.close();
  ({ ctx, p, errors } = await open(browser, 1440, 900, {})); await p.goto(url); await ready(p);
  ok(await step(p) === 3 && await nums(p) === before, 'E29 copy link: the link opens the plan with the same numbers');
  errs.push(...errors); await ctx.close();
  // CSV in German (separator ";", decimal comma) and Turkish letters
  for (const [lang, site, sep, needle] of [['de', 'gaeu', ';', 'Gäuboden'], ['tr', 'thrace', ';', 'Trakya']]) {
    ({ ctx, p, errors } = await open(browser, 1440, 900, { lang })); await p.goto(APP); await ready(p);
    await p.click(`[data-site="${site}"]`); await p.waitForTimeout(200); await ready(p); await go(p, 3);
    await p.click('#nextBtn');
    const c = await download(p, () => p.click('[data-save="csv"]')); const tx = c.raw.toString('utf8');
    const rows = tx.split('\r\n'), dRow = rows.find(l => /^"A: /.test(l)) || '';
    ok(c.raw[0] === 0xEF && tx.includes(needle) && rows[1].startsWith('"' + (lang === 'de' ? 'Feld' : 'Tarla') + '"' + sep) && dRow.split(sep).length === 11 && /;-?\d+,\d;/.test(dRow), `E28 plan CSV ${lang}: "${sep}" separator, decimal comma, ${needle} intact`);
    ok(lang === 'de' ? /Fruchtfolge/.test(tx) && /ß|ä|ö|ü/.test(tx) : /ı|ş|ğ|ü|ö|ç/.test(tx), `E28 plan CSV ${lang}: translated headers with ${lang === 'de' ? 'German' : 'Turkish'} letters`);
    ok(await p.evaluate(l => document.querySelector('[data-save="csv"] b').textContent === (l === 'de' ? 'Als Tabelle herunterladen (CSV)' : 'Tablo olarak indir (CSV)'), lang), `E34 save menu translated (${lang})`);
    errs.push(...errors); await ctx.close();
  }
  // save menu on a phone
  ({ ctx, p, errors } = await open(browser, 320, 640, { lang: 'de' })); await p.goto(APP); await ready(p); await go(p, 3);
  await p.click('#nextBtn'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => { const r = document.getElementById('saveMenu').getBoundingClientRect(), b = document.getElementById('wbar').getBoundingClientRect(); return !document.getElementById('saveMenu').hidden && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= b.top; }) && await overflow(p) <= 1, 'E27 save menu: fits a 320 px phone above the bottom bar');
  errs.push(...errors); await ctx.close();

  // ---------- E32 My fields CSV, E31 remove ----------
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' })); await p.goto(APP); await ready(p); await go(p, 3);
  await p.click('#fields summary');
  ok(await p.evaluate(() => { const b = document.getElementById('fCsv'); return FIELDS.length === 0 && b.disabled && b.title.length > 20 && /No fields yet/.test(document.getElementById('fTable').textContent); }), 'E32 my fields CSV: disabled with a hint while the list is empty');
  await p.fill('#fName', 'Home field'); await p.fill('#fHa', '12'); await p.click('#fForm button[type=submit]');
  await p.fill('#fName', 'Straubing'); await p.fill('#fPlace', 'Straubing'); await p.fill('#fHa', '8'); await p.click('#fForm button[type=submit]');
  await p.waitForFunction(() => FIELDS.length === 2, null, { timeout: 30000 });
  ok(await p.evaluate(() => !document.getElementById('fCsv').disabled), 'E32 my fields CSV: enabled once a field is in the list');
  const fc = await download(p, () => p.click('#fCsv'));   // started at once: waits for the numbers of both fields
  const fl = parse(fc.raw.toString('utf8'), ',');
  console.log('fields CSV:\n' + fc.raw.toString('utf8').slice(1));
  ok(fc.name === 'rotasat-fields.csv' && fc.raw[0] === 0xEF && fl.length === 3 && fl[0][0] === 'name', `E32 my fields CSV: header and two data rows (${fl.length - 1})`);
  ok(fl.slice(1).every(r => r.length === 16 && isFinite(+r[2]) && isFinite(+r[6]) && +r[7] > 300 && isFinite(+r[13]) && r[13] !== '' && +r[14] >= 1) && fl[1][0] === 'Home field' && fl[1][4] === '12', 'E32 my fields CSV: every row has its numbers (place, temperature, rain, profit, rank)');
  await p.click('#fTable [data-del]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => FIELDS.length === 1 && document.querySelectorAll('#fTable tbody tr').length === 1 && /1/.test(document.getElementById('fTotal').textContent)), 'E31 my fields: Remove deletes a field from the list and the total');
  await p.click('#fTable [data-del]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => FIELDS.length === 0 && document.getElementById('fCsv').disabled), 'E31 E32 my fields: empty again, CSV disabled again');

  // ---------- E14 crop break, E18 more options, E21 explanations, E25 charts, E34 language buttons ----------
  await go(p, 2);
  await p.evaluate(() => { for (let i = 1; i < 4; i++) document.getElementById('slot' + i).value = ''; const s = document.getElementById('slot0'); s.value = 'wheat'; s.onchange(); }); await ready(p);
  const pb = await p.evaluate(() => ({ cls: document.getElementById('myPest').className, txt: document.getElementById('myPest').textContent, pill: document.querySelector('.strat.s0 .pill').textContent }));
  ok(/lv[12]/.test(pb.cls) && /Wheat/.test(pb.txt) && pb.pill.includes(pb.txt.replace(/^Crop break:\s*/, '').slice(0, 12)), 'E14 crop break: wheat every year is warned on step 2 and in card A ' + JSON.stringify(pb));
  await p.evaluate(() => [...document.querySelectorAll('#rotChips .rchip[data-rot]')].find(c => c.dataset.rot.includes('.') && pestCheck(c.dataset.rot.split('.')).level === 0).click()); await ready(p);
  ok(await p.evaluate(() => /lv0/.test(document.getElementById('myPest').className) && /long enough/.test(document.getElementById('myPest').textContent)), 'E14 crop break: a long rotation says the break is long enough');
  await p.click('#moreOpts summary');
  for (const [id, v, back] of [['dT', 2, 0], ['dP', -20, 0], ['soc', 30, null], ['rainCal', 450, '']]) {
    const a = await nums(p), old = await p.evaluate(id => document.getElementById(id).value, id);
    await setVal(p, id, v); await ready(p); const b = await nums(p);
    ok(a !== b, `E18 more options: ${id} = ${v} recalculates and changes the numbers`);
    await setVal(p, id, back == null ? old : back); await ready(p);
  }
  await go(p, 3);
  await p.click('.strat.s1 .xpd summary');
  ok(await p.evaluate(() => { const d = document.querySelector('.strat.s1 .xpd'); return d.open && d.querySelector('.cal') && d.querySelectorAll('.xp dt').length === 4 && d.querySelector('.xp').textContent.length > 120; }), 'E21 option B: the fold shows the calendar and four explanation blocks');
  await p.click('#detBtn'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !document.getElementById('details').hidden && !!charts.rrChart && !!charts.soilChart && document.getElementById('rrChart').getBoundingClientRect().height > 100 && /Hide/.test(document.getElementById('detBtn').textContent)), 'E25 charts: details open with the risk and soil carbon charts');
  await p.click('[data-lang="tr"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.lang === 'tr' && /lang=tr/.test(location.hash) && document.getElementById('nextT').textContent === 'Planımı kaydet ya da yazdır' && document.querySelector('[data-lang="tr"]').getAttribute('aria-pressed') === 'true'), 'E34 language buttons: TR switches the page and the address');
  await p.click('[data-lang="de"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.lang === 'de' && document.querySelector('#s3 .hero h2, #answer h2').textContent.length > 5 && !/\{[a-z]+\}|undefined|NaN/.test(document.getElementById('answer').textContent) && !document.body.innerText.includes('—')), 'E34 language buttons: DE fills every text, no placeholder, no em dash');
  ok(await p.evaluate(() => { try { return localStorage.getItem('rotasat_lang') === 'de'; } catch (e) { return false; } }), 'E34 language buttons: the choice is remembered');
  errs.push(...errors); await ctx.close();

  // ---------- E08 my location ----------
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' }));
  await ctx.grantPermissions(['geolocation']); await ctx.setGeolocation({ latitude: 48.85, longitude: 12.6 });
  await p.goto(APP); await ready(p);
  await p.click('#locBtn'); await p.waitForSelector('#pickBtn', { timeout: 5000 });
  ok(await p.evaluate(() => Math.abs(heroMap.getCenter().lat - 48.85) < 0.01 && Math.abs(heroMap.getCenter().lng - 12.6) < 0.01), 'E08 my location: the map moves to the device position and offers the spot');
  await p.click('#pickBtn'); await p.waitForTimeout(200); await ready(p);
  ok(await p.evaluate(() => site.key === 'custom' && Math.abs(site.lat - 48.85) < 0.01 && Math.abs(site.lon - 12.6) < 0.01 && !!lastResults), 'E08 my location: confirming chooses that field and gives a plan');
  errs.push(...errors); await ctx.close();

  // ---------- E11 NASA layer error ----------
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' }));
  await p.route('**gibs.earthdata**', r => r.fulfill({ status: 503, body: 'down' }));
  await p.goto(APP); await ready(p);
  await p.click('#lyBox [data-ly="ndvi"]');
  await p.waitForFunction(() => document.getElementById('lyNote').classList.contains('err'), null, { timeout: 10000 }).catch(() => {});
  ok(await p.evaluate(() => { const nt = document.getElementById('lyNote'); return !nt.hidden && nt.classList.contains('err') && nt.textContent === t('ly_err') && curLayer === 'ndvi'; }), 'E11 NASA layer error: the map says the NASA layer could not load');
  await p.click('#lyBox [data-ly="esri"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => curLayer === 'esri' && !!lastResults), 'E11 NASA layer error: back to the satellite photo, the page keeps working');
  errs.push(...errors.filter(e => !/503|Failed to load resource/.test(e))); await ctx.close();   // the failed tile requests are expected here

  // ---------- E59 profit in 1,000 futures (histogram of A and B) ----------
  // fut: what the page shows; ref: the same counts straight from the model results (r.fut of strategies A and B)
  const fut = p => p.evaluate(() => { const f = document.getElementById('futures'); if (!f) return null;
    const S = pickStrategies(lastResults).slice(0, 2), c = charts.futChart, cv = document.getElementById('futChart').getBoundingClientRect();
    const txt = f.querySelector('.fs').textContent;
    return { txt, aria: f.querySelector('[role=img]').getAttribute('aria-label'), sum: f.dataset.sum, neg: f.dataset.neg, lang: LANG, mode: lastResults.shift.mode,
      ref: S.map(s => ({ n: s.r.fut.length, neg: Array.from(s.r.fut).filter(v => v < 0).length, mean: Array.from(s.r.fut).reduce((a, b) => a + b, 0) / s.r.fut.length, rmean: s.r.mean })),
      chart: c ? c.data.datasets.map(d => d.data.reduce((a, b) => a + b, 0)) : null, cw: cv.width, ch: cv.height, box: f.getBoundingClientRect().right, vw: innerWidth,
      leg: [...f.querySelectorAll('.fleg li b')].map(b => b.textContent), cap: [...f.querySelectorAll('.fcap')].map(x => x.textContent).join(' '),
      none: t('fd_none'), afterCards: f.previousElementSibling && f.previousElementSibling.classList.contains('strat'), mid: S.map(s => Math.round(Array.from(s.r.fut).sort((a, b) => a - b)[500])) }; });
  // numbers in the first sentence, without the "1,000"; the word for "none" counts as 0
  const sentNums = x => { const out = []; const re = new RegExp('(\\d+)|\\b(' + x.none + ')\\b', 'g'); let m; const s = x.txt.replace(/1[.,]000/g, '').split(/[.!]\s/)[0];
    while ((m = re.exec(s))) out.push(m[1] ? +m[1] : 0); return out; };
  const checkFut = (x, tag) => {
    ok(!!x && x.afterCards, `E59 ${tag}: the 1,000 futures chart sits right after the A/B/C cards`);
    if (!x) return;
    ok(x.ref.length === 2 && x.ref.every(r => r.n === 1000) && x.sum === '1000,1000' && JSON.stringify(x.chart) === '[1000,1000]', `E59 ${tag}: counts add up to 1,000 per strategy (${x.sum}, chart ${JSON.stringify(x.chart)})`);
    ok(x.neg === x.ref.map(r => r.neg).join(','), `E59 ${tag}: losing futures ${x.neg} match the model results ${x.ref.map(r => r.neg)}`);
    ok(x.ref.every(r => Math.abs(r.mean - r.rmean) < 0.5), `E59 ${tag}: the futures average to the profit shown in the cards`);
    const sn = sentNums(x), want = x.ref.map(r => r.neg);
    ok(want[0] + want[1] === 0 ? sn.length >= 1 && sn.every(v => v === 0) : JSON.stringify(sn) === JSON.stringify(want), `E59 ${tag}: the sentence names the real counts ${JSON.stringify(sn)} vs ${JSON.stringify(want)}: "${x.txt}"`);
    ok(x.aria.includes(String(want[0])) && x.aria.includes(String(want[1])) && x.leg.length === 2 && /^A: /.test(x.leg[0]) && /^B: /.test(x.leg[1]), `E59 ${tag}: role=img text with the counts and a legend in words`);
    ok(x.cw >= 240 && x.ch >= 150 && x.box <= x.vw + 0.5, `E59 ${tag}: chart drawn ${Math.round(x.cw)}x${Math.round(x.ch)} inside the screen`);
    ok(!/\{[a-z]+\}|undefined|NaN|—/.test(x.txt + x.aria + x.cap + x.leg.join('')), `E59 ${tag}: no placeholder, NaN or em dash`);
  };
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'en' }));
  await p.goto(APP); await ready(p); await go(p, 3); await p.waitForTimeout(300);
  let F = await fut(p); checkFut(F, 'EN Heilbronn today');
  ok(/40 years of NASA POWER weather and real 2000 to 2025 prices/.test(F.cap) && !/2050/.test(F.cap), 'E59 caption names NASA POWER weather and the real prices');
  await p.click('.fieldcard [data-scen="ssp585"]'); await ready(p); await p.waitForTimeout(200);
  const F2 = await fut(p); checkFut(F2, 'EN Heilbronn 2050 high');
  ok(F2.mode === 'ssp585' && JSON.stringify(F2.mid) !== JSON.stringify(F.mid) && /2050/.test(F2.cap), `E59 switching to 2050 redraws the chart (middle futures ${F.mid} to ${F2.mid})`);
  console.log('  E59 Heilbronn today:', F.txt, '| 2050 high:', F2.txt);
  await p.click('.fieldcard [data-scen="now"]'); await ready(p);
  await p.evaluate(() => chooseSite(SITES.find(s => s.key === 'thrace'))); await p.waitForTimeout(200); await ready(p);
  await p.evaluate(() => { for (let i = 0; i < 4; i++) document.getElementById('slot' + i).value = ['wheat', 'sunflower'][i] || ''; runAll(); }); await ready(p);
  const F3 = await fut(p); checkFut(F3, 'EN Thrace wheat, sunflower');
  ok(F3.ref[0].neg > 0 && F3.txt.includes(' ' + F3.ref[0].neg + ','), `E59 Thrace wheat, sunflower: your rotation loses money in some futures (${F3.ref[0].neg})`);
  console.log('  E59 Thrace wheat, sunflower:', F3.txt);
  for (const l of ['tr', 'de']) { await p.click(`[data-lang="${l}"]`); await p.waitForTimeout(300);
    const x = await fut(p); checkFut(x, l.toUpperCase() + ' Thrace');
    ok(x.lang === l && x.txt !== F3.txt && x.neg === F3.neg && /NASA.POWER/.test(x.cap), `E59 ${l.toUpperCase()}: sentence and caption translated, same counts: "${x.txt}"`); }
  await p.evaluate(() => { window.print = () => {}; printReport(); });
  ok(await p.evaluate(() => { const r = document.getElementById('report'); return !r.querySelector('canvas') && /^data:image\/png/.test((r.querySelector('.futc img') || {}).src || ''); }), 'E59 print report: the chart is included as a picture');
  errs.push(...errors); await ctx.close();
  for (const [w, h, l] of [[390, 844, 'tr'], [320, 640, 'de']]) {
    ({ ctx, p, errors } = await open(browser, w, h, { lang: l }));
    await p.goto(APP); await ready(p); await go(p, 3); await p.waitForTimeout(300);
    await p.evaluate(() => document.getElementById('futures').scrollIntoView()); await p.waitForTimeout(100);
    const x = await fut(p); checkFut(x, `${l.toUpperCase()} ${w}px`);
    ok(await overflow(p) <= 1, `E59 ${w}px: no sideways scrolling with the chart`);
    errs.push(...errors); await ctx.close(); }

  console.log(`\ncases covered here: ${[...seen].sort().join(' ')}`);
  console.log(`checks: ${n}, failed: ${bad}`); console.log('ERRORS', errs.length, errs.slice(0, 10));
  await browser.close(); process.exit(bad || errs.length ? 1 : 0);
})();
