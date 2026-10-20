const {test}=require('node:test'),assert=require('node:assert/strict');
const parser=import('../public/student-import.js');
test('student rows normalize names, retain distinct similar names, skip numbered blanks and duplicates',async()=>{
 const {parseStudentRows,HEADERS}=await parser;
 const r=parseStudentRows([HEADERS,[1,'  example   student ','school'],[2,'EXAMPLE STUDENT','SCHOOL'],[3,'Kevin Chan','School'],[4,'Kelvin Chan','School'],[5,'','']]);
 assert.equal(r.rows.length,3);assert.equal(r.duplicates,1);assert.equal(r.rows[0].name,'EXAMPLE STUDENT');
});
test('malformed student files fail before import',async()=>{
 const {parseStudentRows,HEADERS}=await parser;
 assert.throws(()=>parseStudentRows([['No','Name','School']]),/Row 1/);
 assert.throws(()=>parseStudentRows([HEADERS,[1,'Example','']]),/row 2/);
 assert.throws(()=>parseStudentRows([HEADERS,[1,'','School']]),/row 2/);
 assert.throws(()=>parseStudentRows([HEADERS,[1,'x'.repeat(161),'School']]),/160/);
 assert.throws(()=>parseStudentRows([HEADERS,[1,'','']]),/at least one/);
 assert.throws(()=>parseStudentRows([HEADERS,...Array.from({length:401},(_,i)=>[i,'Example '+i,'School'])]),/400/);
});

test('gender imports validate values and retain compatibility with old templates',async()=>{const {parseStudentRows,HEADERS}=await parser;assert.equal(parseStudentRows([HEADERS,[1,'Test','School','female']]).rows[0].gender,'Female');assert.equal(parseStudentRows([HEADERS.slice(0,3),[1,'Test','School']]).rows[0].gender,'Not specified');assert.throws(()=>parseStudentRows([HEADERS,[1,'Test','School','wrong']]),/gender/);});
