const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('../../../apps/web/node_modules/typescript');
const vm=require('node:vm');
const result=ts.transpileModule(fs.readFileSync('apps/web/src/lib/pricing.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}});
const moduleScope={exports:{}};vm.runInNewContext(result.outputText,{exports:moduleScope.exports});
const {percentageDiscount}=moduleScope.exports;
for(const subtotal of [0,1,29,12501,25002,999999999999999,Number.MAX_SAFE_INTEGER]){
 for(const percent of [0,1,15,50,99,100]){
  const expected=Number((BigInt(subtotal)*BigInt(percent)+BigInt(50))/BigInt(100));
  assert.equal(percentageDiscount(subtotal,percent),expected,`${subtotal} @ ${percent}%`);
 }
}
for(const invalid of [-1,101,1.5,NaN])assert.equal(percentageDiscount(10000,invalid),0);
console.log('PASS: client discount math matches exact integer half-up rounding, including large totals and invalid percentages.');
