const ADMIN='kjk86LonpVfk83NfpajQrhGxvOv1';
function text(v,max=160){if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw Error('Please enter valid text.');return v.trim();}
function cents(v){const n=Number(v);if(!Number.isFinite(n)||n<=0||n>100000||Math.abs(n*100-Math.round(n*100))>1e-7)throw Error('Amount must be RM0.01–100,000 with at most two decimals.');return Math.round(n*100);}
function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Invalid payment date.');return v;}
function month(v){if(typeof v!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(v))throw Error('Invalid month.');return v;}
function number(s,m){return s.format.replaceAll('{YYYY}',m.slice(0,4)).replaceAll('{MM}',m.slice(5)).replace('{SEQ}',String(s.next).padStart(s.padding,'0'));}
function students(rows){if(!Array.isArray(rows)||rows.length>400)throw Error('Upload a student JSON array (maximum 400 records).');const seen=new Set();return rows.map((s,i)=>{const id=s.id||'KCC-S'+String(i+1).padStart(3,'0');if(!/^[A-Za-z0-9_-]{1,80}$/.test(id)||seen.has(id))throw Error('Student IDs must be valid and unique.');seen.add(id);return {id,name:text(s.name),school:text(s.school)};});}
module.exports={ADMIN,text,cents,date,month,number,students};
