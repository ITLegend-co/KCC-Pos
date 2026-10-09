const {test}=require('node:test'),assert=require('node:assert/strict');
test('training and insurance descriptions use exact wording and school',async()=>{
 const {paymentDescription}=await import('../public/receipt-description.js');
 assert.equal(paymentDescription({month:'2026-06',school:'EXAMPLE SCHOOL'}),'SPORT CLIMBING TRAINING FEES - JUNE 2026\nEXAMPLE SCHOOL');
 assert.equal(paymentDescription({category:'insurance',month:'2026-06',school:'EXAMPLE SCHOOL'}),'INSURANCE FEE - ALLIANZ STUDENT PERSONAL ACCIDENT\nEXAMPLE SCHOOL');
});
