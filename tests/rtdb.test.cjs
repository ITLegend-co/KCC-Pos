for(const k of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'])delete process.env[k];
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const ADMIN='kjk86LonpVfk83NfpajQrhGxvOv1';
(async()=>{const env=await initializeTestEnvironment({projectId:'demo-kcc-pos',database:{host:'127.0.0.1',port:9000,rules:fs.readFileSync(require('node:path').join(__dirname,'../database.rules.json'),'utf8')}});await env.clearDatabase();
function client(id,verified=true){const db=env.authenticatedContext(id,{email:id===ADMIN?'adlybinbakran@gmail.com':id+'@example.com',email_verified:verified}).database();let source=fs.readFileSync(require('node:path').join(__dirname,'../public/store.js'),'utf8').replace(/^import .*;\n/,'').replaceAll('export ','');const context={console,Date,crypto,TextEncoder,fetch:async()=>({status:403}),getDatabase:()=>db,ref:(_,p)=>db.ref(p||undefined),get:r=>r.get(),set:(r,d)=>r.set(d),update:(r,d)=>r.update(d),push:r=>r.push(),runTransaction:async(r,fn)=>r.transaction(fn,undefined,false),onValue:(r,fn,e)=>{r.on('value',fn,e);return()=>r.off('value',fn);}};vm.createContext(context);vm.runInContext(source,context);context.auth={currentUser:{uid:id,email:id===ADMIN?'adlybinbakran@gmail.com':id+'@example.com'}};return {db,store:vm.runInContext('createStore({},auth)',context)};}
const admin=client(ADMIN),staff=client('staff'),pending=client('pending'),unverified=client('staff',false);const step=async(label,f)=>{console.log('RUN '+label);await f();console.log('PASS '+label);};
await step('admin bootstrap and student import',async()=>{await admin.store.call('registerProfile',{name:'Example Clerk'});await admin.store.call('initializeClub',{students:[{id:'S1',name:'Example Student',school:'Example School'},{id:'S2',name:'Another Student',school:'Example School'}]});});
await step('staff profiles cannot self-approve',async()=>{await staff.store.call('registerProfile',{name:'Example Clerk'});await pending.store.call('registerProfile',{name:'Example Clerk'});await assertFails(pending.db.ref('users/pending/status').set('approved'));await assertFails(pending.db.ref('users/pending/role').set('admin'));await admin.store.call('reviewUser',{uid:'staff',status:'approved'});await staff.store.call('registerProfile',{name:'Example Clerk'});});
await step('pending, unverified and public accounts cannot read club data',async()=>{await assertFails(pending.db.ref('students').get());await assertFails(unverified.db.ref('students').get());await assertFails(env.unauthenticatedContext().database().ref('students').get());await assertSucceeds(staff.db.ref('students').get());});
await step('approved staff Excel imports preserve records and retry safely',async()=>{
 const rows=[{name:' Example Student ',school:'Example School'},{name:'New Workbook Student',school:'Example School'},{name:'New Workbook Student',school:'Example School'}];
 let r=await staff.store.call('importStudents',{students:rows});assert.equal(r.added,1);assert.equal(r.skipped,2);
 r=await admin.store.call('importStudents',{students:rows});assert.equal(r.added,0);assert.equal(r.skipped,3);
 assert.equal((await staff.db.ref('students/S1/name').get()).val(),'Example Student');
 await assert.rejects(pending.store.call('importStudents',{students:rows}));
 await assert.rejects(staff.store.call('importStudents',{students:[{name:'Before bad row',school:'School'},{name:'Bad',school:''}]}));
 assert.equal(Object.values((await staff.db.ref('students').get()).val()).some(s=>s.name==='BEFORE BAD ROW'),false);
});
await step('staff edit student details while identity, creator and deletion controls remain protected',async()=>{
 await staff.store.call('editStudent',{studentId:'S1',name:'Example Student',school:'Example School',gender:'Female'});
 assert.equal((await staff.db.ref('students/S1/gender').get()).val(),'Female');
 await assertFails(staff.db.ref('students/S1/createdBy').set('staff'));
 await assertFails(staff.db.ref('students/S1/deleted').set(true));
 await assertFails(staff.db.ref('students/S1').remove());
 await assert.rejects(pending.store.call('editStudent',{studentId:'S1',name:'Changed',school:'School',gender:'Male'}));
});
await step('attendance allows approved staff, rejects races and preserves visit history',async()=>{
 const at=1792461600000,studentId='S1';
 await assert.rejects(pending.store.call('clockIn',{studentId,at,offset:-480}));
 await assertFails(unverified.db.ref('attendance').get());
 await staff.store.call('clockIn',{studentId,at,offset:-480});
 let state=(await staff.db.ref('attendance/S1').get()).val(),id=state.activeId;
 assert.equal(state.sessions[id].clockIn,at);assert.equal(state.sessions[id].clockInBy,'staff');
 await assert.rejects(admin.store.call('clockIn',{studentId,at,offset:-480}),/already/);
 await assertFails(staff.db.ref('attendance/S1/activeId').set(''));
 await assertFails(staff.db.ref('attendance/S1/sessions/'+id+'/clockIn').set(at+1));
 await assert.rejects(staff.store.call('clockOut',{studentId,sessionId:id,at:at-1,offset:-480}),/earlier/);
 await admin.store.call('clockOut',{studentId,sessionId:id,at:at+3600000,offset:-480});
 await assert.rejects(staff.store.call('clockOut',{studentId,sessionId:id,at:at+3600001,offset:-480}),/already/);
 await assertFails(staff.db.ref('attendance/S1/sessions/'+id).remove());
 await assertFails(admin.db.ref('attendance/S1').remove());
 await staff.store.call('clockIn',{studentId,at:at+7200000,offset:-480});
 state=(await staff.db.ref('attendance/S1').get()).val();assert.equal(Object.keys(state.sessions).length,2);
 assert.equal(state.sessions[id].clockOut,at+3600000);
 await staff.store.call('clockOut',{studentId,sessionId:state.activeId,at:at+7300000,offset:-480});
 const outcomes=await Promise.allSettled([staff.store.call('clockIn',{studentId,at:at+8000000,offset:-480}),admin.store.call('clockIn',{studentId,at:at+8000000,offset:-480})]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
});
const payment=(id,amount,date='2026-10-01',studentId='S1')=>({studentId,date,amount,method:'Cash',reference:'',requestId:id});
await step('daily payments, retries and calendar boundaries',async()=>{await staff.store.call('addPayment',payment('request-00001',9.6));await staff.store.call('addPayment',payment('request-00001',9.6));await staff.store.call('addPayment',payment('request-00002',2.4,'2026-10-31'));await staff.store.call('addPayment',payment('request-00003',5,'2026-11-01'));const ledger=(await staff.db.ref('ledger/2026-10/S1').get()).val();assert.equal(ledger.totalCents,1200);await assert.rejects(staff.store.call('addPayment',payment('request-00001',10)),/different details/);});
await step('stored payments and totals cannot be forged or deleted',async()=>{const ledger=(await staff.db.ref('ledger/2026-10/S1').get()).val();await assertFails(staff.db.ref('events/2026-10/S1/'+ledger.head+'/amountCents').set(100));await assertFails(staff.db.ref('events/2026-10/S1/'+ledger.head).remove());await assertFails(staff.db.ref('ledger/2026-10/S1/totalCents').set(1));await assertFails(staff.db.ref('ledger/2026-10/S1').remove());});
let receipt;
await step('monthly receipt, idempotency and sequential numbering',async()=>{receipt=await staff.store.call('issueReceipt',{studentId:'S1',month:'2026-10'});assert.equal(receipt.totalCents,1200);assert.equal(receipt.number,'KCC0152');assert.equal(receipt.items.length,2);const repeat=await staff.store.call('issueReceipt',{studentId:'S1',month:'2026-10'});assert.equal(repeat.number,'KCC0152');assert.equal((await staff.db.ref('numbering/next').get()).val(),153);});
await step('closed month and saved receipt amounts are protected',async()=>{await assert.rejects(staff.store.call('addPayment',payment('request-00004',2)),/already saved/);await assertFails(staff.db.ref('ledger/2026-10/S1/receipt/totalCents').set(1));await assertFails(staff.db.ref('ledger/2026-10/S1/receipt').remove());await assertFails(staff.db.ref('numbering/format').set('X{SEQ}'));await assertFails(staff.db.ref('numbering/next').set(900));await assertFails(staff.db.ref('numbers/KCC0152').remove());});
await step('admin corrections require audit and preserve original amount',async()=>{await assertFails(admin.db.ref('ledger/2026-10/S1/receipt/totalCents').set(1400));await admin.store.call('correctReceipt',{id:'S1_2026-10',amount:14,reason:'Example correction'});const r=(await admin.db.ref('ledger/2026-10/S1/receipt').get()).val();assert.equal(r.totalCents,1400);assert.equal(r.originalTotalCents,1200);assert.equal(r.revision,2);await assertFails(admin.db.ref('corrections/'+r.lastCorrectionId).remove());});
await step('concurrent payments retain every committed amount',async()=>{await Promise.all([staff.store.call('addPayment',payment('request-con01',2,'2026-10-02','S2')),staff.store.call('addPayment',payment('request-con02',3,'2026-10-02','S2'))]);assert.equal((await staff.db.ref('ledger/2026-10/S2/totalCents').get()).val(),500);});
await step('concurrent receipt issuance returns one number per student-month',async()=>{const r=await Promise.all([staff.store.call('issueReceipt',{studentId:'S2',month:'2026-10'}),staff.store.call('issueReceipt',{studentId:'S2',month:'2026-10'})]);assert.equal(r[0].number,r[1].number);assert.notEqual(r[0].number,receipt.number);});
await step('admin numbering format and permanent number uniqueness',async()=>{await admin.store.call('saveSettings',{format:'KCC-{YYYY}-{MM}-{SEQ}',next:1,padding:4});const r=await staff.store.call('issueReceipt',{studentId:'S1',month:'2026-11'});assert.equal(r.number,'KCC-2026-11-0001');await assertFails(staff.db.ref('numbers/KCC0152').set({}));});
await step('admin edits daily payment, preserves originals and revises closed receipt',async()=>{
 const before=(await staff.db.ref('ledger/2026-10/S1').get()).val(),events=(await staff.db.ref('events/2026-10/S1').get()).val(),id=Object.keys(events).find(id=>events[id].requestId==='request-00001');
 const edit={studentId:'S1',month:'2026-10',paymentId:id,date:'2026-10-03',amount:10.6,method:'QR',reference:'Fixed reference',reason:'Correct entry'};
 await assert.rejects(staff.store.call('editPayment',edit),/Administrator/);
 await admin.store.call('editPayment',edit);
 const after=(await staff.db.ref('ledger/2026-10/S1').get()).val();assert.equal(after.totalCents,1300);assert.equal(after.receipt.totalCents,1500);assert.equal(after.receipt.originalTotalCents,1200);assert.equal(after.receipt.number,before.receipt.number);assert.equal(after.receipt.revision,3);
 assert.equal((await staff.db.ref('events/2026-10/S1/'+id+'/amountCents').get()).val(),960);
 await assertFails(staff.db.ref('ledger/2026-10/S1/editHead').set('fake'));await assertFails(staff.db.ref('ledger/2026-10/S1/editHead').remove());
 await assertFails(admin.db.ref('paymentChanges/2026-10/S1/'+after.editHead).remove());
 await admin.store.call('editPayment',{...edit,amount:11.6});assert.equal((await staff.db.ref('ledger/2026-10/S1/totalCents').get()).val(),1400);
 await assert.rejects(admin.store.call('editPayment',{...edit,date:'2026-11-01'}),/reporting month/);
});
await step('edited open month keeps totals when staff adds another payment',async()=>{
 await staff.store.call('addPayment',payment('open-edit-01',2,'2026-12-01','S2'));const l=(await staff.db.ref('ledger/2026-12/S2').get()).val();
 await admin.store.call('editPayment',{studentId:'S2',month:'2026-12',paymentId:l.head,date:'2026-12-02',amount:3,method:'Cash',reference:'',reason:'Correct amount'});
 await staff.store.call('addPayment',payment('open-edit-02',4,'2026-12-03','S2'));const after=(await staff.db.ref('ledger/2026-12/S2').get()).val();assert.equal(after.totalCents,700);assert.ok(after.editHead);
 const r=await staff.store.call('issueReceipt',{studentId:'S2',month:'2026-12'});assert.equal(r.totalCents,700);assert.equal(r.items.reduce((n,p)=>n+p.amountCents,0),700);
});
await step('insurance is recorded without receipt and cannot reserve new insurance numbers',async()=>{
 const training=(await staff.db.ref('ledger/2026-10/S1').get()).val();
 const pay={...payment('insurance-01',20),category:'insurance'};await staff.store.call('addPayment',pay);await staff.store.call('addPayment',pay);
 const l=(await staff.db.ref('insuranceLedger/2026-10/S1').get()).val();assert.equal(l.totalCents,2000);assert.equal(l.receipt,undefined);
 await assert.rejects(staff.store.call('issueReceipt',{studentId:'S1',month:'2026-10',category:'insurance'}),/do not have receipts/);
 await staff.store.call('addPayment',{...payment('insurance-02',10),category:'insurance'});
 await admin.store.call('editPayment',{studentId:'S1',month:'2026-10',category:'insurance',paymentId:l.head,date:'2026-10-02',amount:25,method:'QR',account:'bank',reference:'',reason:'Correct insurance'});
 assert.equal((await staff.db.ref('insuranceLedger/2026-10/S1/totalCents').get()).val(),3500);assert.equal((await staff.db.ref('ledger/2026-10/S1/totalCents').get()).val(),training.totalCents);
 await assertFails(admin.db.ref('insuranceLedger/2026-10/S1/receipt').set({...training.receipt,number:'FAKE'}));
});
await step('legacy saved insurance receipts are retained without blocking further payments',async()=>{
 await staff.store.call('addPayment',{...payment('legacy-insurance-1',2,'2027-04-01','S2'),category:'insurance'});
 const legacy=(await staff.db.ref('ledger/2026-10/S2/receipt').get()).val();await env.withSecurityRulesDisabled(async context=>{await context.database().ref('insuranceLedger/2027-04/S2/receipt').set({...legacy,totalCents:200,originalTotalCents:200});});
 await staff.store.call('addPayment',{...payment('legacy-insurance-2',3,'2027-04-02','S2'),category:'insurance'});
 const l=(await staff.db.ref('insuranceLedger/2027-04/S2').get()).val();assert.equal(l.totalCents,500);assert.equal(l.receipt.totalCents,200);
});
await step('staff full name is captured immutably on student payments',async()=>{
 await staff.store.call('saveProfileName',{name:'Named Receiver'});await staff.store.call('addPayment',payment('name-test',2,'2027-03-01','S1'));
 const l=(await staff.db.ref('ledger/2027-03/S1').get()).val(),p=(await staff.db.ref('events/2027-03/S1/'+l.head).get()).val();assert.equal(p.receivedByName,'Named Receiver');assert.equal(p.createdBy,'staff');assert.equal(p.account,'cash');
 await assertFails(staff.db.ref('events/2027-03/S1/'+l.head+'/receivedByName').set('Other'));
 await staff.store.call('saveProfileName',{name:'Renamed Receiver'});assert.equal((await staff.db.ref('events/2027-03/S1/'+l.head+'/receivedByName').get()).val(),'Named Receiver');
});
await step('treasury is admin-only, entries retry safely and voids retain originals',async()=>{
 await admin.store.call('saveOpening',{date:'2026-10-01',bank:100,cash:50});await assert.rejects(admin.store.call('saveOpening',{date:'2026-11-01',bank:1,cash:1}));
 const entry={requestId:'treasury-001',date:'2026-10-02',type:'expense',account:'bank',amount:20,transactionCategory:'Equipment',description:'Example purchase',reference:'REF'};
 await admin.store.call('addTransaction',entry);await admin.store.call('addTransaction',entry);
 await assert.rejects(admin.store.call('addTransaction',{...entry,amount:21}),/different details/);
 await assert.rejects(staff.store.call('addTransaction',{...entry,requestId:'unauthorized'}),/Administrator/);await assertFails(staff.db.ref('treasuryTransactions').get());await assertFails(pending.db.ref('treasuryOpening').get());
 await assertFails(staff.db.ref('treasuryTransactions/direct').set({}));await assertFails(admin.db.ref('treasuryTransactions/treasury-001/amountCents').set(2));await assertFails(admin.db.ref('treasuryTransactions/treasury-001').remove());
 await admin.store.call('voidTransaction',{id:'treasury-001',reason:'Example correction'});assert.equal((await admin.db.ref('treasuryTransactions/treasury-001/amountCents').get()).val(),2000);await assertFails(admin.db.ref('treasuryVoids/treasury-001').remove());
 await admin.store.call('addTransaction',{...entry,requestId:'transfer-001',type:'transfer',account:'cash',toAccount:'bank'});await assert.rejects(admin.store.call('addTransaction',{...entry,requestId:'transfer-bad',type:'transfer',toAccount:'bank'}),/valid transaction/);
 await admin.store.call('saveReconciliation',{month:'2026-10',bank:100,cash:20,note:'Example counted balances'});await assertFails(staff.db.ref('treasuryChecks').get());
 await admin.store.call('addAsset',{name:'Example Equipment',quantity:1,value:20,location:'Club',transactionId:'treasury-001'});await assertFails(staff.db.ref('treasuryAssets').get());
});
await step('only admin deletes and restores students, preserving historical records',async()=>{
 await assert.rejects(staff.store.call('deleteStudent',{studentId:'S2'}),/Administrator/);await assertFails(staff.db.ref('students/S2').remove());await assertFails(staff.db.ref('students/S2/deleted').set(true));
 await admin.store.call('deleteStudent',{studentId:'S2'});assert.equal((await staff.db.ref('students/S2/deleted').get()).val(),true);assert.equal((await staff.db.ref('students/S2/name').get()).val(),'Another Student');assert.ok((await staff.db.ref('ledger/2026-12/S2/receipt').get()).val());
 await assert.rejects(staff.store.call('addPayment',payment('deleted-add',1,'2027-01-01','S2')),/deleted/);await assertFails(admin.db.ref('students/S2').remove());
 await admin.store.call('deleteStudent',{studentId:'S2',restore:true});await staff.store.call('addPayment',payment('restored-add',1,'2027-01-01','S2'));
});
await step('only admin voids payments, including fully cancelling a saved receipt',async()=>{
 await staff.store.call('addPayment',payment('void-1',10,'2027-05-01'));await staff.store.call('addPayment',payment('void-2',5,'2027-05-02'));
 const receipt=await staff.store.call('issueReceipt',{studentId:'S1',month:'2027-05'}),events=(await staff.db.ref('events/2027-05/S1').get()).val(),ids=Object.keys(events),first=ids.find(id=>events[id].amountCents===1000),second=ids.find(id=>events[id].amountCents===500),action={studentId:'S1',month:'2027-05',paymentId:first,action:'void',reason:'Wrong entry'};
 await assert.rejects(staff.store.call('paymentAction',action),/Administrator/);await admin.store.call('paymentAction',action);
 let l=(await staff.db.ref('ledger/2027-05/S1').get()).val();assert.equal(l.totalCents,500);assert.equal(l.receipt.totalCents,500);assert.equal(l.receipt.number,receipt.number);assert.equal((await staff.db.ref('events/2027-05/S1/'+first+'/amountCents').get()).val(),1000);
 await assert.rejects(admin.store.call('paymentAction',action),/already been/);await assert.rejects(admin.store.call('editPayment',{...action,action:'edit',date:'2027-05-01',amount:2,method:'Cash',reason:'Retry'}),/already been/);
 await admin.store.call('paymentAction',{...action,paymentId:second});l=(await staff.db.ref('ledger/2027-05/S1').get()).val();assert.equal(l.totalCents,0);assert.equal(l.receipt.totalCents,0);assert.equal(l.receipt.originalTotalCents,1500);assert.equal(l.receipt.revision,3);
 await assertFails(staff.db.ref('paymentChanges/2027-05/S1/'+l.editHead+'/action').set('refund'));
 await staff.store.call('addPayment',{...payment('insurance-void',3,'2027-05-01'),category:'insurance'});const il=(await staff.db.ref('insuranceLedger/2027-05/S1').get()).val();await admin.store.call('paymentAction',{...action,paymentId:il.head,category:'insurance'});assert.equal((await staff.db.ref('insuranceLedger/2027-05/S1/totalCents').get()).val(),0);
});
await step('full refunds retain collections and receipt, record account/date, prevent double refunds',async()=>{
 await staff.store.call('addPayment',payment('refund-1',9,'2027-06-01'));const r=await staff.store.call('issueReceipt',{studentId:'S1',month:'2027-06'}),l=(await staff.db.ref('ledger/2027-06/S1').get()).val();
 const action={studentId:'S1',month:'2027-06',paymentId:l.head,action:'refund',refundDate:'2027-07-02',refundAccount:'bank',reason:'Returned to student'};
 await assert.rejects(staff.store.call('paymentAction',action),/Administrator/);await assert.rejects(admin.store.call('paymentAction',{...action,refundDate:'2027-05-31'}),/before the payment/);
 const attempts=await Promise.allSettled([admin.store.call('paymentAction',action),admin.store.call('paymentAction',action)]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 const after=(await staff.db.ref('ledger/2027-06/S1').get()).val(),change=(await staff.db.ref('paymentChanges/2027-06/S1/'+after.editHead).get()).val();assert.equal(after.totalCents,900);assert.equal(after.receipt.totalCents,900);assert.equal(after.receipt.number,r.number);assert.equal(change.action,'refund');assert.equal(change.refundDate,'2027-07-02');assert.equal(change.refundAccount,'bank');assert.equal(change.beforeCents,900);assert.equal(change.afterCents,900);
 await assert.rejects(admin.store.call('paymentAction',action),/already been/);await assert.rejects(admin.store.call('paymentAction',{...action,action:'void'}),/already been/);await assertFails(admin.db.ref('paymentChanges/2027-06/S1/'+after.editHead).remove());
 await staff.store.call('addPayment',{...payment('insurance-refund',4,'2027-06-01','S2'),category:'insurance'});const il=(await staff.db.ref('insuranceLedger/2027-06/S2').get()).val();await admin.store.call('paymentAction',{...action,studentId:'S2',paymentId:il.head,category:'insurance'});assert.equal((await staff.db.ref('insuranceLedger/2027-06/S2/totalCents').get()).val(),400);
});
await step('staff request refund; approval alone leaves totals unchanged; processing requires admin',async()=>{
 await staff.store.call('addPayment',payment('review-refund-pay',12,'2027-08-01'));const l=(await staff.db.ref('ledger/2027-08/S1').get()).val(),request={requestId:'staff-refund-request',studentId:'S1',month:'2027-08',paymentId:l.head,action:'refund',reason:'Student requested return'};
 await staff.store.call('requestPaymentAction',request);await staff.store.call('requestPaymentAction',request);assert.equal((await staff.db.ref('ledger/2027-08/S1/totalCents').get()).val(),1200);
 await assertFails(staff.db.ref('paymentRequests/staff-refund-request/reason').set('Changed'));await assertFails(staff.db.ref('paymentRequests/staff-refund-request').remove());await assertFails(staff.db.ref('paymentRequestReviews/staff-refund-request').set({decision:'approved',reason:'Self approval',by:'staff',at:'2027-08-01'}));
 await assert.rejects(admin.store.call('processPaymentRequest',{id:request.requestId,refundDate:'2027-08-02',refundAccount:'cash'}),/approval is required/);await assert.rejects(staff.store.call('reviewPaymentRequest',{id:request.requestId,decision:'approved',reason:'Self approve'}),/Administrator/);
 await admin.store.call('reviewPaymentRequest',{id:request.requestId,decision:'approved',reason:'Checked and approved'});assert.equal((await staff.db.ref('ledger/2027-08/S1/editHead').get()).val(),null);assert.equal((await staff.db.ref('ledger/2027-08/S1/totalCents').get()).val(),1200);
 await assert.rejects(staff.store.call('processPaymentRequest',{id:request.requestId,refundDate:'2027-08-02',refundAccount:'cash'}),/Administrator/);await admin.store.call('processPaymentRequest',{id:request.requestId,refundDate:'2027-09-02',refundAccount:'bank'});
 const after=(await staff.db.ref('ledger/2027-08/S1').get()).val(),change=(await staff.db.ref('paymentChanges/2027-08/S1/'+after.editHead).get()).val();assert.equal(change.requestId,request.requestId);assert.equal(change.refundDate,'2027-09-02');assert.equal(change.refundAccount,'bank');assert.equal(after.totalCents,1200);await assert.rejects(admin.store.call('processPaymentRequest',{id:request.requestId,refundDate:'2027-09-02',refundAccount:'bank'}),/already been/);
});
await step('request rejection preserves payment; approved insurance void processes only its target',async()=>{
 await staff.store.call('addPayment',{...payment('request-insurance',7,'2027-08-01','S2'),category:'insurance'});const l=(await staff.db.ref('insuranceLedger/2027-08/S2').get()).val(),request={requestId:'staff-void-rejected',studentId:'S2',month:'2027-08',category:'insurance',paymentId:l.head,action:'void',reason:'Incorrect duplicate'};
 await staff.store.call('requestPaymentAction',request);await admin.store.call('reviewPaymentRequest',{id:request.requestId,decision:'rejected',reason:'Payment is valid'});await assert.rejects(admin.store.call('processPaymentRequest',{id:request.requestId}),/approval is required/);assert.equal((await staff.db.ref('insuranceLedger/2027-08/S2/totalCents').get()).val(),700);
 await assert.rejects(admin.store.call('reviewPaymentRequest',{id:request.requestId,decision:'approved',reason:'Changed decision'}),/already been reviewed/);
 const next={...request,requestId:'staff-void-approved'};await staff.store.call('requestPaymentAction',next);await admin.store.call('reviewPaymentRequest',{id:next.requestId,decision:'approved',reason:'Confirmed duplicate'});await admin.store.call('processPaymentRequest',{id:next.requestId});const after=(await staff.db.ref('insuranceLedger/2027-08/S2').get()).val();assert.equal(after.totalCents,0);assert.equal((await staff.db.ref('insurancePaymentChanges/2027-08/S2/'+after.editHead+'/requestId').get()).val(),next.requestId);
 await assert.rejects(pending.store.call('requestPaymentAction',next));
});
await step('cheque is blocked for new entries and edits while historical actions remain available',async()=>{
 for(const category of ['training','insurance']){
  const root=category==='insurance'?'insuranceEvents':'events',ledgerRoot=category==='insurance'?'insuranceLedger':'ledger',changesRoot=category==='insurance'?'insurancePaymentChanges':'paymentChanges',m=category==='insurance'?'2027-11':'2027-10';
  const d={...payment('cheque-check-'+category,8,m+'-01'),category};
  await assert.rejects(staff.store.call('addPayment',{...d,method:'Cheque'}),/payment method/);
  await staff.store.call('addPayment',d);
  const l=(await staff.db.ref(ledgerRoot+'/'+m+'/S1').get()).val(),eventPath=root+'/'+m+'/S1/'+l.head,event=(await staff.db.ref(eventPath).get()).val();
  await assertFails(staff.db.ref(root+'/'+m+'/S1/forged-cheque').set({...event,method:'Cheque',previous:l.head,totalCents:1600,requestId:'forged-'+category}));
  await env.withSecurityRulesDisabled(async context=>{await context.database().ref(eventPath+'/method').set('Cheque');});
  assert.equal((await staff.db.ref(eventPath+'/method').get()).val(),'Cheque');
  await assert.rejects(admin.store.call('editPayment',{studentId:'S1',month:m,paymentId:l.head,category,date:m+'-01',amount:8,method:'Cheque',account:'bank',reason:'Correction'}),/valid method/);
  const action=category==='insurance'?'void':'refund';
  await admin.store.call('paymentAction',{studentId:'S1',month:m,paymentId:l.head,category,action,reason:'Historical payment action',refundDate:m+'-02',refundAccount:'bank'});
  const after=(await staff.db.ref(ledgerRoot+'/'+m+'/S1').get()).val(),change=(await staff.db.ref(changesRoot+'/'+m+'/S1/'+after.editHead).get()).val();
  assert.equal(change.method,'Cheque');assert.equal(change.action,action);
 }
});
await step('revoked staff lose reads and writes',async()=>{await admin.store.call('reviewUser',{uid:'staff',status:'rejected'});await assertFails(staff.db.ref('students').get());await assert.rejects(staff.store.call('addStudent',{name:'Example',school:'School'}));});
await env.cleanup();console.log('ALL REALTIME RULES CHECKS PASSED');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
