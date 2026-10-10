export const accounts={bank:'CIMB current account',cash:'Cash box'};
export function studentTransactions(ledgers,events,changes,paymentRows,category,students={}){
 const rows=[];for(const [month,ls]of Object.entries(ledgers||{}))for(const [studentId,l]of Object.entries(ls))for(const p of paymentRows(l,events?.[month]?.[studentId],changes?.[month]?.[studentId])){
 if(p.status==='void')continue;
 const row={...p,id:category+'_'+p.id,type:'income',account:p.account||(p.method==='Cash'?'cash':'bank'),category:category==='insurance'?'Student insurance':'Student training fees',description:students[studentId]?.name||studentId,source:'Student payment',recordedBy:p.receivedByName||p.createdBy};rows.push(row);
 if(p.status==='refunded')rows.push({...row,id:'refund_'+p.refundId,type:'expense',date:p.refundDate,account:p.refundAccount,amountCents:p.refundAmountCents,category:'Student refund',reference:p.actionReason,source:'Student refund',by:p.refundBy,recordedBy:p.refundBy});
 }return rows;
}
export function monthlyReport(month,rows,opening,voids={}){
 const active=rows.filter(r=>!voids[r.id]),selected=active.filter(r=>r.date.slice(0,7)===month),start=month+'-01',end=month+'-31';
 const delta=r=>r.type==='transfer'?{[r.account]:-r.amountCents,[r.toAccount]:r.amountCents}:{[r.account]:(r.type==='expense'?-1:1)*r.amountCents};
 const ready=!!opening&&opening.date<=start,begin=ready?{bank:opening.bankCents,cash:opening.cashCents}:null,close=begin?{...begin}:null;
 if(ready)for(const r of active){if(r.date<opening.date||r.date>end)continue;const d=delta(r);for(const a of ['bank','cash']){close[a]+=d[a]||0;if(r.date<start)begin[a]+=d[a]||0;}}
 const income=selected.filter(r=>r.type==='income').reduce((n,r)=>n+r.amountCents,0),expense=selected.filter(r=>r.type==='expense').reduce((n,r)=>n+r.amountCents,0);
 return {month,rows:selected.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),income,expense,net:income-expense,opening:begin,closing:close,transfers:selected.filter(r=>r.type==='transfer').reduce((n,r)=>n+r.amountCents,0)};
}
