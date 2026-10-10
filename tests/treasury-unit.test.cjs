const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('public/treasury-model.js','utf8').replaceAll('export ',''),context);
test('opening balances carry forward, transfers are neutral and voids are excluded',()=>{
 const rows=[{id:'old',date:'2026-09-01',type:'income',account:'bank',amountCents:99999},{id:'prior',date:'2026-10-10',type:'income',account:'cash',amountCents:1000},{id:'in',date:'2026-11-01',type:'income',account:'cash',amountCents:2000},{id:'out',date:'2026-11-02',type:'expense',account:'bank',amountCents:500},{id:'move',date:'2026-11-03',type:'transfer',account:'cash',toAccount:'bank',amountCents:1200},{id:'void',date:'2026-11-04',type:'expense',account:'cash',amountCents:900}];
 const r=context.monthlyReport('2026-11',rows,{date:'2026-10-01',bankCents:5000,cashCents:1000},{void:{reason:'Duplicate'}});
 assert.equal(r.income,2000);assert.equal(r.expense,500);assert.equal(r.net,1500);assert.equal(r.opening.cash,2000);assert.equal(r.closing.cash,2800);assert.equal(r.closing.bank,5700);assert.equal(r.closing.bank+r.closing.cash-r.opening.bank-r.opening.cash,r.net);assert.equal(r.rows.length,3);assert.equal(context.monthlyReport('2026-09',rows,{date:'2026-10-01',bankCents:0,cashCents:0}).closing,null);
});
test('student collections keep actor name, source category and account without receipt totals',()=>{
 const row={id:'p1',date:'2026-10-02',studentId:'s1',amountCents:300,method:'QR',receivedByName:'Example Clerk',createdBy:'uid'};
 const rows=context.studentTransactions({'2026-10':{s1:{receipt:{totalCents:999}}}},{},{},()=>[row],'insurance',{s1:{name:'Student'}});
 assert.equal(rows[0].amountCents,300);assert.equal(rows[0].recordedBy,'Example Clerk');assert.equal(rows[0].account,'bank');assert.equal(rows[0].category,'Student insurance');
});
