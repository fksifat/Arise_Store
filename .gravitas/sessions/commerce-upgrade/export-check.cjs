const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('../../../apps/web/node_modules/typescript');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText,{exports,Intl,Date});return exports;}
const {makeCSV}=load('apps/web/src/lib/csv.ts');
const csv=makeCSV([['Name','Amount'],['রহিম, "Buyer"',150],['=2+3','line\nnext'],[' +SUM(1,1)','@CMD'],['\t=1','-3']]);
assert(csv.startsWith('\ufeff'));
assert(csv.includes('"রহিম, ""Buyer""","150"'));
assert(csv.includes('"\'=2+3","line\nnext"'));
assert(csv.includes('"\' +SUM(1,1)","\'@CMD"'));
assert(csv.includes('"\'\t=1","\'-3"'));
const {businessDate}=load('apps/web/src/lib/business.ts');
assert.equal(businessDate('2026-10-24T17:59:59'),'2026-10-24');
assert.equal(businessDate('2026-10-24T18:00:00'),'2026-10-25');
assert.equal(businessDate('2026-10-25T18:00:00Z'),'2026-10-26');
console.log('PASS: Unicode CSV quoting, formula neutralization and UTC-to-Dhaka date boundaries.');
