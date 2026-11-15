// Every case in docs/E2E_CASES.md must be named (by its ID) in at least one automated check of v2/tests.
const fs = require('fs'); const path = require('path');
const md = fs.readFileSync(path.resolve(__dirname, '..', '..', 'docs', 'E2E_CASES.md'), 'utf8');
const ids = [...md.matchAll(/^\| (E\d\d) \|/gm)].map(m => m[1]);
const src = ['e2e_v2.js', 'e2e_cases.js', 'check_soil_timeout.js', 'check_i18n.js'].map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
const missing = ids.filter(id => !new RegExp('[\'"`](E\\d\\d )*' + id + '\\b').test(src));
console.log('cases:', ids.length, '| without an automated check:', missing.length ? missing.join(', ') : 'none');
process.exit(missing.length || !ids.length ? 1 : 0);
