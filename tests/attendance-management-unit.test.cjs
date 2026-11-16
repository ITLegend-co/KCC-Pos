const {test}=require('node:test'),assert=require('node:assert/strict');
test('deleted attendance removes debt without releasing paid cash or used credit',async()=>{
 const {trainingWallet}=await import('../public/attendance-payments.js');
 const records={S:{sessions:{a:{clockIn:1000000,clockInOffset:0,feeCents:500,attendanceDeleted:true},b:{clockIn:2000000,clockInOffset:0,feeCents:500}}}};
 const payments=[{studentId:'S',id:'p',month:'2026-10',amountCents:1000,appliedCents:500,attendanceSessionId:'a'}];
 const w=trainingWallet(records,payments,[{studentId:'S',paymentId:'p',paymentMonth:'2026-10',sessionId:'a',amountCents:500}]);
 assert.equal(w.visits.length,1);assert.equal(w.visits[0].dueCents,500);assert.equal(w.credits.S,500);
 records.S.sessions.a.feeCents=1000;
 assert.equal(trainingWallet(records,payments,[{studentId:'S',paymentId:'p',paymentMonth:'2026-10',sessionId:'a',amountCents:500}]).credits.S,0);
});
test('moving attendance preserves legacy payment allocation and committed changes only',async()=>{
 const {applyAttendanceChanges}=await import('../public/session-model.js'),{trainingWallet}=await import('../public/attendance-payments.js');
 const original={clockIn:Date.parse('2026-10-02T07:00Z'),clockInOffset:-480,feeCents:500};
 const events={S:{a:{e:{session:{...original,clockIn:Date.parse('2026-10-03T01:00Z'),allocationDate:'2026-10-02'},action:'edit'},orphan:{action:'delete',session:original}}}};
 const result=applyAttendanceChanges({S:{sessions:{a:original}}},events,{S:{a:'e'}});
 const w=trainingWallet(result,[{studentId:'S',date:'2026-10-02',amountCents:500}]);assert.equal(w.visits[0].dueCents,0);assert.equal(w.visits[0].date,'2026-10-03');assert.equal(original.clockIn,Date.parse('2026-10-02T07:00Z'));
});
