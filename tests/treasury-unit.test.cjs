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

test('voids remove collections and refunds create one expense in the return month',()=>{
 const records=[{id:'void',studentId:'s1',date:'2026-10-01',amountCents:0,status:'void',createdBy:'staff'},{id:'refund',studentId:'s1',date:'2026-10-02',amountCents:1000,method:'Cash',status:'refunded',refundId:'r1',refundDate:'2026-11-02',refundAccount:'bank',refundAmountCents:1000,refundBy:'admin',actionReason:'Returned'}];
 const rows=context.studentTransactions({'2026-10':{s1:{}}},{},{},()=>records,'training');assert.equal(rows.length,2);
 const opening={date:'2026-10-01',bankCents:2000,cashCents:0},oct=context.monthlyReport('2026-10',rows,opening),nov=context.monthlyReport('2026-11',rows,opening);
 assert.equal(oct.income,1000);assert.equal(oct.expense,0);assert.equal(nov.income,0);assert.equal(nov.expense,1000);assert.equal(nov.closing.bank,1000);assert.equal(nov.closing.cash,1000);
});
test('six-month comparisons cross years, separate collections, refunds and unavailable balances',()=>{
 const rows=[
  {id:'t',date:'2026-12-01',type:'income',account:'cash',amountCents:1000,source:'Student payment',category:'Student training fees'},
  {id:'i',date:'2027-01-02',type:'income',account:'bank',amountCents:2000,source:'Student payment',category:'Student insurance'},
  {id:'r',date:'2027-01-03',type:'expense',account:'cash',amountCents:500,source:'Student refund',category:'Student refund'},
  {id:'x',date:'2027-01-04',type:'transfer',account:'bank',toAccount:'cash',amountCents:100},
  {id:'void',date:'2027-01-05',type:'income',account:'cash',amountCents:9999}
 ];
 const series=context.monthlyTrends('2027-01',rows,{date:'2026-12-01',bankCents:10000,cashCents:0},{void:{}});
 assert.equal(series.length,6);assert.equal(series[0].month,'2026-08');assert.equal(series[0].balance,null);assert.equal(series[4].training,1000);assert.equal(series[4].balance,11000);
 assert.equal(series[5].insurance,2000);assert.equal(series[5].training,0);assert.equal(series[5].income,2000);assert.equal(series[5].expense,500);assert.equal(series[5].balance,12500);
 assert.equal(context.monthChange(2000,1000).percent,100);assert.equal(context.monthChange(500,1000).percent,-50);
 assert.equal(context.monthChange(1000,0).percent,null);assert.equal(context.monthChange(1000,-1000).percent,null);assert.equal(context.monthChange(1000,-1000).difference,2000);
});
