// Training fees are RM5 per recorded visit; insurance never settles attendance.
export const TRAINING_FEE_CENTS=500;
export function attendanceDate(session){return new Date(session.clockIn-session.clockInOffset*60000).toISOString().slice(0,10);}
export function attendanceBalances(records,payments){
 const visits=Object.entries(records||{}).flatMap(([studentId,r])=>Object.entries(r.sessions||{}).map(([sessionId,s])=>({...s,studentId,sessionId,date:attendanceDate(s),feeCents:TRAINING_FEE_CENTS,paidCents:0}))).sort((a,b)=>a.clockIn-b.clockIn||a.sessionId.localeCompare(b.sessionId));
 const sameDay=new Map(),linked=new Map();
 for(const p of payments){if(p.category==='insurance'||p.status==='void'||p.status==='refunded')continue;const amount=Math.max(0,p.amountCents||0),map=p.attendanceSessionId?linked:sameDay,key=JSON.stringify([p.studentId,p.attendanceSessionId||p.date]);map.set(key,(map.get(key)||0)+amount);}
 for(const v of visits){const key=JSON.stringify([v.studentId,v.sessionId]);v.paidCents=Math.min(v.feeCents,linked.get(key)||0);}
 // Allocate unlinked, same-day payments once, oldest visit first. Linked payments
 // are reserved for their visit and never also count towards another session.
 for(const v of visits){const key=JSON.stringify([v.studentId,v.date]),available=sameDay.get(key)||0,used=Math.min(v.feeCents-v.paidCents,available);v.paidCents+=used;sameDay.set(key,available-used);v.dueCents=v.feeCents-v.paidCents;}
 return visits;
}
