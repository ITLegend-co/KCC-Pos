export const TRAINING_FEE_CENTS=500;
export function attendanceDate(session){return new Date(session.clockIn-session.clockInOffset*60000).toISOString().slice(0,10);}
export function trainingWallet(records,payments,applications=[]){
 const visits=Object.entries(records||{}).flatMap(([studentId,r])=>Object.entries(r.sessions||{}).map(([sessionId,s])=>({...s,studentId,sessionId,date:attendanceDate(s),feeCents:s.feeCents??TRAINING_FEE_CENTS,paidCents:0,creditUsedCents:0}))).sort((a,b)=>a.clockIn-b.clockIn||a.sessionId.localeCompare(b.sessionId));
 const sources=[];
 for(const p of payments){if(p.category==='insurance'||p.status==='void'||p.status==='refunded')continue;const amount=Math.max(0,p.amountCents||0);let left=amount;
  const matches=visits.filter(v=>v.studentId===p.studentId&&(p.attendanceSessionId?v.sessionId===p.attendanceSessionId:p.appliedCents===undefined&&v.date===p.date));
  // New records freeze the cash portion applied to attendance. The rest is credit.
  let budget=Math.min(amount,p.appliedCents??amount);
  for(const v of matches){const use=Math.min(budget,v.feeCents-v.paidCents);v.paidCents+=use;budget-=use;left-=use;}
  // Historical payments did not distinguish advances from completed training.
  sources.push({...p,availableCents:p.appliedCents===undefined?0:left});
 }
 for(const a of applications){const source=sources.find(p=>p.studentId===a.studentId&&p.id===a.paymentId&&p.month===a.paymentMonth),visit=visits.find(v=>v.studentId===a.studentId&&v.sessionId===a.sessionId);if(!source||!visit)continue;const use=Math.max(0,Math.min(a.amountCents,source.availableCents,visit.feeCents-visit.paidCents));source.availableCents-=use;visit.paidCents+=use;visit.creditUsedCents+=use;}
 for(const v of visits)v.dueCents=v.feeCents-v.paidCents;
 return {visits,sources:sources.filter(p=>p.availableCents>0),credits:Object.fromEntries([...new Set(sources.map(p=>p.studentId))].map(id=>[id,sources.filter(p=>p.studentId===id).reduce((n,p)=>n+p.availableCents,0)]))};
}
export function attendanceBalances(records,payments,applications=[]){return trainingWallet(records,payments,applications).visits;}
