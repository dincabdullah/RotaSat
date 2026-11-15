// Import of a list of fields from Excel or CSV (docs/E2E_CASES.md E48 to E57). Every outside service is the fake of harness.js:
// NASA POWER fixtures, Nominatim (a few places), GIBS land cover and Overpass (farmland, buildings, water), SheetJS from ROTASAT_XLSX.
// Every check name starts with its case ID. Screenshots (deviceScaleFactor 1): the import summary, My fields after the import, a 390 px phone.
const { chromium, open, ready, overflow, APP, OUT, XLSX_JS, LAND, path, fs } = require('./harness');
if (!XLSX_JS) { console.log('SheetJS not found: set ROTASAT_XLSX to the folder of the xlsx package (npm install xlsx@0.18.5 in a scratch folder)'); process.exit(1); }
const XLSX = require(path.resolve(path.dirname(XLSX_JS), '..'));
(async () => {
  const browser = await chromium.launch(); const errs = []; let bad = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
  const download = async (p, click) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), click()]); return { name: d.suggestedFilename(), raw: fs.readFileSync(await d.path()) }; };
  const upload = (p, name, buffer, mimeType = 'text/csv') => p.setInputFiles('#impFile', { name, mimeType, buffer: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer) });
  const summary = async p => { await p.waitForSelector('#impOk, #impBody .imperr', { timeout: 120000 });
    return p.evaluate(() => ({ chips: [...document.querySelectorAll('#impBody .impsum .ib')].map(e => e.textContent), rows: [...document.querySelectorAll('#impBody tbody tr')].map(tr => ({ cls: tr.className, td: [...tr.cells].map(c => c.innerText.replace(/\s+/g, ' ').trim()) })),
      err: [...document.querySelectorAll('#impBody .imperr')].map(e => e.textContent).join(' | '), add: (document.getElementById('impOk') || {}).textContent, recs: IMP.rows.map(o => ({ name: o.name, lat: o.lat, lon: o.lon, ha: o.ha, rot: o.rot, soc: o.soc, clay: o.clay, rej: o.rej, warn: o.warn })) })); };
  const allDone = p => p.waitForFunction(() => FIELDS.length && FIELDS.every(f => FRES[f.id] && (FRES[f.id].best || FRES[f.id].err)) && !fBusy, null, { timeout: 300000 });
  let ctx, p, errors, calls;

  // ---------- E48 upload box and the template (CSV and Excel), and the template read back ----------
  for (const lang of ['en', 'tr', 'de']) {
    ({ ctx, p, errors } = await open(browser, 1440, 900, { lang })); await p.goto(APP); await ready(p);
    const box = await p.evaluate(() => { const b = document.getElementById('impBox'), r = b.getBoundingClientRect(), c = document.querySelectorAll('#sites .site')[3].getBoundingClientRect();
      return { txt: b.innerText.replace(/\s+/g, ' '), below: r.top >= c.bottom, inS1: r.bottom <= document.getElementById('s1').getBoundingClientRect().bottom, tpl: b.querySelectorAll('[data-tpl]').length, mf: document.querySelectorAll('#fields [data-imp]').length + document.querySelectorAll('#fields [data-tpl]').length }; });
    const want = { en: 'Upload your fields (Excel or CSV)', tr: 'Tarlalarını yükle (Excel ya da CSV)', de: 'Ihre Felder hochladen (Excel oder CSV)' }[lang];
    ok(box.txt.includes(want) && box.below && box.inS1 && box.tpl === 2 && box.mf === 3, `E48 ${lang}: step 1 has "${want}" and the template under the example fields, My fields has them too ${JSON.stringify(box)}`);
    const c = await download(p, () => p.click('#impBox [data-tpl="csv"]')), tx = c.raw.toString('utf8'), sep = lang === 'en' ? ',' : ';';
    const lines = tx.replace(/^﻿/, '').split('\r\n');
    ok(c.name === 'rotasat-fields-template.csv' && c.raw[0] === 0xEF && lines[0] === ['name', 'lat', 'lon', 'place', 'area_ha', 'rotation', 'soc_g_kg', 'clay_pct'].map(h => `"${h}"`).join(sep) && lines.length === 4, `E48 ${lang}: template CSV with the eight columns and three example rows (separator "${sep}")`);
    const x = await download(p, () => p.click('#impBox [data-tpl="xlsx"]'));
    const wb = XLSX.read(x.raw, { type: 'buffer' }), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    ok(x.name === 'rotasat-fields-template.xlsx' && wb.SheetNames.join() === 'fields,help' && rows[0].join() === 'name,lat,lon,place,area_ha,rotation,soc_g_kg,clay_pct' && rows.length === 4 && typeof rows[1][1] === 'number', `E48 ${lang}: template Excel file with a fields sheet (numbers as numbers) and a help sheet`);
    // the Excel template, uploaded as it is, imports three fields
    await upload(p, x.name, x.raw, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); const s = await summary(p);
    ok(s.recs.length === 3 && s.recs.every(r => !r.rej && !r.warn.length && r.rot.length >= 2 && r.lat) && /3/.test(s.add), `E48 ${lang}: the filled-in template reads back: 3 fields, crops recognised ${JSON.stringify(s.recs.map(r => r.rot.join('-')))}`);
    await p.click('#impCancel');
    ok(await p.evaluate(() => !document.getElementById('impDlg').open && FIELDS.length === 0), `E48 ${lang}: Cancel closes the dialog and adds nothing`);
    errs.push(...errors); await ctx.close();
  }

  // ---------- E49 CSV with commas: summary, then My fields with progress and the farm total ----------
  ({ ctx, p, errors, calls } = await open(browser, 1440, 900, { lang: 'en' })); await p.goto(APP); await ready(p);
  const csv1 = '﻿name,lat,lon,place,area_ha,rotation,soc_g_kg,clay_pct\r\n' +
    'North field,49.21,9.31,,12,wheat > barley,,\r\n' +
    ',,,Straubing,8,"rapeseed, wheat, barley",18,24\r\n' +
    'Yard,48.9,12.65,,5,"buğday, arpa",,\r\n' +
    'Lake,47.6,9.4,,3,Weizen; Gerste,,\r\n' +
    'Odd,49.3,9.4,,-2,wheat > potato > barley,,\r\n' +
    'Nowhere,,,Atlantis,,,,\r\n' +
    'Bad,123,9,,4,maize,,\r\n';
  await upload(p, 'farm.csv', csv1); let s = await summary(p);
  console.log('summary:', JSON.stringify(s.chips), s.rows.map(r => r.cls + ' ' + r.td.join(' / ')).join('\n  '));
  ok(JSON.stringify(s.chips) === JSON.stringify(['2 fine', '2 with a warning', '3 rejected']) && s.add === 'Add 4 fields to My fields', 'E49 import CSV: summary says 2 fine, 2 with a warning, 3 rejected before anything is added ' + JSON.stringify(s.chips));
  ok(await p.evaluate(() => FIELDS.length === 0 && document.getElementById('impDlg').open), 'E49 import CSV: nothing is added before the user confirms');
  const R = Object.fromEntries(s.recs.map(r => [r.name, r]));
  ok(R['North field'].lat === 49.21 && R['North field'].ha === 12 && R['North field'].rot.join() === 'wheat,barley' && R['Field 2'] && R['Field 2'].lat === 48.882 && R['Field 2'].soc === 18 && R['Field 2'].clay === 24, 'E49 import CSV: coordinates, area, rotation and soil read; an empty name becomes "Field 2"');
  ok(/Coordinates not valid/.test(R.Bad.rej) && /Place not found: Atlantis/.test(R.Nowhere.rej) && /Area not valid/.test(R.Odd.warn.join()) , 'E49 import CSV: the reason of each rejected row is given');
  ok(s.rows.length === 7 && s.rows.every((r, i) => +r.td[0] === i + 2) && s.rows.filter(r => r.cls === 'rej').every(r => r.td[5].startsWith('Rejected')), 'E49 import CSV: one line per row with the row number of the file');
  await p.screenshot({ path: path.join(OUT, 'import_summary_1440x900.png') });
  await p.click('#impOk'); await p.waitForTimeout(400);
  const prog = await p.evaluate(() => ({ step: +document.body.dataset.step, open: document.querySelector('#fields details').open, n: FIELDS.length, msg: document.getElementById('fMsg').textContent, prog: document.getElementById('fProg').textContent, hid: document.getElementById('fProg').hidden }));
  ok(prog.step === 3 && prog.open && prog.n === 4 && prog.msg === '4 fields added from farm.csv.' && !prog.hid && /^Reading NASA data for field \d of 4$/.test(prog.prog), 'E49 import CSV: confirmed fields go to My fields on step 3, with "Reading NASA data for field i of 4" ' + JSON.stringify(prog));
  await allDone(p);
  const tot = await p.evaluate(() => { const ha = FIELDS.reduce((a, f) => a + (f.ha || 0), 0), sum = FIELDS.reduce((a, f) => a + (f.ha || 0) * FRES[f.id].best.mean, 0);
    return { ok: FIELDS.every(f => FRES[f.id].best), txt: document.getElementById('fTotal').textContent, ha: f1(ha), m: money(sum), prog: document.getElementById('fProg').hidden, rows: document.querySelectorAll('#fTable tbody tr').length }; });
  ok(tot.ok && tot.rows === 4 && tot.txt.includes('4 fields') && tot.txt.includes(tot.ha + ' ha') && tot.txt.includes(tot.m) && tot.prog, 'E49 import CSV: NASA data, best rotation and profit for every field, farm total of the areas ' + JSON.stringify(tot));
  ok(await p.evaluate(() => { const tr = [...document.querySelectorAll('#fTable tbody tr')]; const y = tr.find(r => r.textContent.includes('Yard')), o = tr.find(r => r.textContent.includes('North field'));
    return !!y.querySelector('.ib.warn') && /buildings/.test(y.querySelector('.fwarn').textContent) && !o.querySelector('.ib.warn'); }), 'E54 land check in the import: the field with buildings is imported with a warning badge in My fields');
  ok(/water, not a field.*NASA MODIS land cover 500 m/.test(R.Lake.rej) && R.Lake.rej.includes('OpenStreetMap'), 'E54 land check in the import: the row in the lake is rejected, the reason names the sources');
  ok(calls.overpass === 5 && calls.landcover === 5, `E54 land check in the import: each row with a position is checked once (${calls.overpass} OpenStreetMap, ${calls.landcover} MODIS)`);
  await p.evaluate(() => document.getElementById('fields').scrollIntoView()); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(OUT, 'myfields_after_import_1440x900.png') });
  // ---------- E56 open an imported field ----------
  await p.click('#fTable tbody tr:nth-child(2) .fname'); await p.waitForTimeout(300); await ready(p);
  const op = await p.evaluate(() => ({ step: +document.body.dataset.step, lat: site.lat, lon: site.lon, slots: [0, 1, 2, 3].map(i => document.getElementById('slot' + i).value).filter(Boolean).join(), soc: +document.getElementById('soc').value, clay: +document.getElementById('clay').value, note: document.getElementById('soilNote').textContent, me: lastResults.me.seq.join() }));
  ok(op.step === 3 && op.lat === 48.882 && op.lon === 12.569 && op.slots === 'rapeseed,wheat,barley' && op.me === 'rapeseed,wheat,barley' && op.soc === 18 && op.clay === 24 && /from your file/.test(op.note), 'E56 open an imported field: its name opens the plan with its rotation and the soil from the file ' + JSON.stringify(op));
  // ---------- E55 the same file again: duplicates are refused ----------
  await upload(p, 'farm.csv', csv1); s = await summary(p);
  ok(s.recs.filter(r => r.rej === 'Already in My fields').length === 4, 'E55 import again: fields already in My fields are rejected as duplicates');
  await p.click('#impCancel');
  // ---------- E55 round trip: the My fields CSV (English) reads back in a fresh browser ----------
  const ex = await download(p, () => p.click('#fCsv'));
  const mine = await p.evaluate(() => FIELDS.map(f => [f.name, f.lat, f.lon, f.ha, f.rot.join('-')].join('|')).sort());
  errs.push(...errors); await ctx.close();
  for (const lang of ['en', 'de']) {
    let file = ex;
    if (lang === 'de') {   // the German export: ";" and decimal comma
      ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'de' })); await p.goto(APP); await ready(p);
      await p.evaluate(rows => { FIELDS = rows.map(r => ({ id: fid(), name: r[0], lat: r[1], lon: r[2], ha: r[3], place: 'Ort, Kreis', key: '', rot: r[4] })); saveFields(); renderFields(); computeFields(); },
        [['Nordschlag', 49.158, 9.109, 12.5, ['wheat', 'barley']], ['Rübenacker', 48.8, 12.62, 7, ['sugarbeet', 'wheat', 'barley']]]);
      await allDone(p); file = await download(p, () => p.evaluate(() => document.getElementById('fCsv').click())); errs.push(...errors); await ctx.close();
      ok(/;49,158;9,109;12,5;"wheat-barley";/.test(file.raw.toString('utf8')), 'E55 round trip: the German export uses ";" and a decimal comma');
    }
    ({ ctx, p, errors } = await open(browser, 390, 844, { lang })); await p.goto(APP); await ready(p);
    await upload(p, file.name, file.raw); s = await summary(p);
    const back = s.recs.map(r => [r.name, r.lat, r.lon, r.ha || 0, r.rot.join('-')].join('|')).sort();
    const exp = lang === 'en' ? mine : ['Nordschlag|49.158|9.109|12.5|wheat-barley', 'Rübenacker|48.8|12.62|7|sugarbeet-wheat-barley'];
    ok(JSON.stringify(back) === JSON.stringify(exp) && s.recs.every(r => !r.rej), `E55 round trip (${lang}): the My fields CSV imports back with the same names, positions, areas and rotations ${JSON.stringify(back)}`);
    if (lang === 'en') {   // the 390 px phone with the import summary
      const fit = await p.evaluate(() => { const r = document.getElementById('impDlg').getBoundingClientRect(), f = document.getElementById('impFoot').getBoundingClientRect(); return { l: r.left, r: r.right, b: f.bottom, vh: innerHeight, tw: document.querySelector('.imptab').scrollWidth, bw: document.getElementById('impBody').clientWidth }; });
      ok(fit.l >= 0 && fit.r <= 390 && fit.b <= fit.vh && fit.tw <= fit.bw + 1 && await overflow(p) <= 1, 'E57 phone 390: the import summary fits the screen, no sideways scrolling ' + JSON.stringify(fit));
      await p.screenshot({ path: path.join(OUT, 'import_phone_390.png') });
      await p.click('#impOk'); await p.waitForTimeout(300);
      ok(await p.evaluate(() => FIELDS.length === 4 && +document.body.dataset.step === 3) && await overflow(p) <= 1, 'E57 phone 390: fields added, My fields without overflow');
      await allDone(p); await p.evaluate(() => document.getElementById('fields').scrollIntoView()); await p.waitForTimeout(200);
      await p.screenshot({ path: path.join(OUT, 'myfields_after_import_phone_390.png') });
    }
    errs.push(...errors); await ctx.close();
  }

  // ---------- E50 semicolons and decimal commas, E52 places one per second, E53 crop names ----------
  ({ ctx, p, errors, calls } = await open(browser, 1440, 900, { lang: 'de' })); await p.goto(APP); await ready(p);
  const csv2 = '﻿Name;Breite;Länge;Ort;Fläche;Fruchtfolge;SOC;Ton\r\n' +
    'Schlag 1;49,21;9,31;;12,5;Weizen; Gerste;;\r\n'.replace('Weizen; Gerste', '"Weizen; Gerste"') +
    'Schlag 2;;;Straubing;7,25;"Raps > Weizen > Gerste";21,5;30\r\n' +
    'Tarla 3;;;Hayrabolu;10;"buğday, ayçiçeği, nohut";;\r\n' +
    'Field 4;;;Testdorf;3;"sugar beet, canola, corn, lentils";;\r\n' +
    'Schlag 5;48,95;12,7;;2;"Zuckerrübe - Mais - Sojabohne";;\r\n' +
    'Tarla 6;49,32;9,42;;1;"şeker pancarı; kanola; mısır; mercimek";;\r\n' +
    'Feld 7;49,33;9,43;;1;"Brache, Wicke oder Klee, Kartoffel";;\r\n';
  await upload(p, 'betrieb.csv', csv2); s = await summary(p);
  const D = Object.fromEntries(s.recs.map(r => [r.name, r]));
  ok(D['Schlag 1'].lat === 49.21 && D['Schlag 1'].lon === 9.31 && D['Schlag 1'].ha === 12.5 && D['Schlag 2'].ha === 7.25 && D['Schlag 2'].soc === 21.5 && D['Schlag 2'].clay === 30, 'E50 import CSV with ";" and decimal comma: numbers read right, German column names recognised');
  ok(D['Schlag 2'].lat === 48.882 && D['Tarla 3'].lat === 41.13 && D['Field 4'].lat === 49.2 && calls.search === 3, `E52 place names: villages and towns found with Nominatim (${calls.search} searches)`);
  const gaps = calls.searchAt.slice(1).map((t, i) => t - calls.searchAt[i]);
  ok(gaps.every(g => g >= 950), 'E52 place names: at most one search a second ' + JSON.stringify(gaps));
  ok(D['Schlag 1'].rot.join() === 'wheat,barley' && D['Schlag 2'].rot.join() === 'rapeseed,wheat,barley' && D['Tarla 3'].rot.join() === 'wheat,sunflower,chickpea' && D['Field 4'].rot.join() === 'sugarbeet,rapeseed,maize,lentil'
    && D['Schlag 5'].rot.join() === 'sugarbeet,maize,soybean' && D['Tarla 6'].rot.join() === 'sugarbeet,rapeseed,maize,lentil' && D['Feld 7'].rot.join() === 'fallow,vetch', 'E53 crop names in English, Turkish and German (with > , ; and -) ' + JSON.stringify(s.recs.map(r => r.rot.join('-'))));
  ok(D['Feld 7'].warn.join() === 'Kulturen nicht erkannt: Kartoffel' && s.rows.find(r => r.td[1] === 'Feld 7').td[5].includes('Kartoffel'), 'E53 unknown crop: listed by name in the summary, the field is imported with a warning');
  errs.push(...errors); await ctx.close();

  // ---------- E51 Excel file (made with SheetJS), drag and drop ----------
  ({ ctx, p, errors } = await open(browser, 1440, 900, { lang: 'tr' })); await p.goto(APP); await ready(p);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tarlalarım'], [], ['ad', 'enlem', 'boylam', 'yer', 'alan', 'rotasyon', 'soc', 'kil'], ['Kuzey', 41.1951, 27.1061, '', 15.5, 'buğday > ayçiçeği', 12.4, 32], ['Güney', '', '', 'Hayrabolu', 9, 'arpa; kanola', '', ''], ['Göl', 47.6, 9.4, '', 2, 'buğday', '', '']]), 'Sayfa1');
  const xbuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  ok(await p.evaluate(() => !window.XLSX && ![...document.scripts].some(s => /xlsx/.test(s.src))), 'E51 Excel: SheetJS is not loaded before a file is chosen');
  // drag and drop onto the upload box
  await p.evaluate(b64 => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u], 'tarlalar.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const box = document.getElementById('impBox'); ['dragenter', 'dragover', 'drop'].forEach(type => box.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }))); }, xbuf.toString('base64'));
  s = await summary(p);
  const X = Object.fromEntries(s.recs.map(r => [r.name, r]));
  ok(X.Kuzey && X.Kuzey.lat === 41.1951 && X.Kuzey.ha === 15.5 && X.Kuzey.soc === 12.4 && X.Kuzey.clay === 32 && X.Kuzey.rot.join() === 'wheat,sunflower' && X['Güney'].lat === 41.13 && X['Güney'].rot.join() === 'barley,rapeseed', 'E51 Excel: a dropped .xlsx with Turkish column names under a title row is read ' + JSON.stringify(s.recs.map(r => r.name)));
  ok(await p.evaluate(() => !!window.XLSX && [...document.scripts].some(s => s.src === 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js')), 'E51 Excel: SheetJS 0.18.5 is loaded from cdnjs only when needed');
  ok(/Reddedildi/.test(s.rows.find(r => r.td[1] === 'Göl').td[5]) && JSON.stringify(s.chips) === JSON.stringify(['2 sorunsuz', '0 uyarılı', '1 reddedildi']), 'E54 land check in the import (TR): the row in the lake is rejected ' + JSON.stringify(s.chips));
  await p.click('#impOk'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => FIELDS.length === 2 && /2 tarla eklendi/.test(document.getElementById('fMsg').textContent)), 'E51 Excel: two fields added to My fields');
  errs.push(...errors); await ctx.close();

  // ---------- E58 files that cannot be used ----------
  ({ ctx, p, errors } = await open(browser, 320, 640, { lang: 'en', xlsxFail: true })); await p.goto(APP); await ready(p);
  ok(await p.evaluate(() => { const b = document.getElementById('impBox').getBoundingClientRect(); return b.width > 250 && b.right <= innerWidth; }) && await overflow(p) <= 1, 'E57 phone 320: the upload box fits on step 1');
  await upload(p, 'notes.csv', 'hello;world\r\n1;2\r\n'); s = await summary(p);
  ok(/No column names found/.test(s.err) && !(await p.$('#impOk')), 'E58 a file without known columns: the dialog says what is missing');
  await p.click('#impCancel');
  await upload(p, 'empty.csv', 'name,lat,lon\r\n,,\r\n'); s = await summary(p);
  ok(/no rows with fields/.test(s.err), 'E58 a file with only a header: "no rows with fields"');
  await p.click('#impCancel');
  const many = 'name,lat,lon\r\n' + Array.from({ length: 53 }, (_, i) => `F${i + 1},${(49 + i * 0.01).toFixed(2)},${(9.5 + i * 0.01).toFixed(2)}`).join('\r\n');
  await upload(p, 'many.csv', many); s = await summary(p);
  ok(s.recs.length === 50 && /Only the first 50 rows are read. 3 more rows/.test(s.err) && /50/.test(s.add), 'E58 more than 50 rows: the first 50 are read and the rest is named');
  await p.screenshot({ path: path.join(OUT, 'import_phone_320_many.png') });
  await p.click('#impCancel');
  await upload(p, 'farm.xlsx', xbuf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); s = await summary(p);
  ok(/Excel reader could not be loaded/.test(s.err), 'E58 Excel reader not reachable: the dialog asks for a CSV instead');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => !document.getElementById('impDlg').open), 'E58 Esc closes the import dialog');
  errs.push(...errors.filter(e => !/Failed to load resource|ERR_FAILED/.test(e))); await ctx.close();

  console.log(`checks: ${n}, failed: ${bad}`); console.log('ERRORS', errs.length, errs.slice(0, 10));
  await browser.close(); process.exit(bad || errs.length ? 1 : 0);
})();
