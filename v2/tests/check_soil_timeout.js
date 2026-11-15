// E38 (docs/E2E_CASES.md): SoilGrids never answers; the plan must still appear with typical soil values and a note saying so.
const H = require('./harness');
(async () => {
  const b = await H.chromium.launch();
  const { p, errors } = await H.open(b, 1440, 900, { lang: 'en' });
  await p.route('**rest.isric.org**', () => {}); // never answers
  const t0 = Date.now(); await p.goto(H.APP); await H.ready(p, 60000); const ms = Date.now() - t0;
  const note = await p.$eval('#soilNote', e => e.textContent);
  console.log('answer after', ms, 'ms; soil note:', note.slice(0, 90), '| ERRORS', errors.length);
  const pass = ms < 40000 && note.length > 20 && errors.length === 0;
  console.log(pass ? 'PASS' : 'FAIL', 'E38 soil service timeout: plan shown without SoilGrids, with a note');
  console.log(`checks: 1, failed: ${pass ? 0 : 1}`);
  await b.close(); process.exit(pass ? 0 : 1);
})();
