const H = require('./harness');
(async () => {
  const b = await H.chromium.launch();
  const { p, errors } = await H.open(b, 1440, 900, { lang: 'en' });
  await p.route('**rest.isric.org**', () => {}); // never answers
  const t0 = Date.now(); await p.goto(H.APP); await H.ready(p, 60000);
  const note = await p.$eval('#soilNote', e => e.textContent);
  console.log('answer after', Date.now() - t0, 'ms; soil note:', note.slice(0, 90), '| ERRORS', errors.length);
  await b.close();
})();
