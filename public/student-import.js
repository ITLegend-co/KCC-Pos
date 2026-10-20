export const HEADERS=['NO.','STUDENT FULLNAME','SCHOOL','GENDER'];
const clean=v=>String(v??'').trim().replace(/\s+/g,' ');
export function parseStudentRows(grid){
 if(!Array.isArray(grid)||!grid.length)throw Error('The Students sheet is empty.');
 if(!HEADERS.slice(0,3).every((h,i)=>clean(grid[0][i]).toUpperCase()===h))throw Error('Row 1 must contain NO., STUDENT FULLNAME, SCHOOL in columns A–C.');
 if(grid[0][3] && clean(grid[0][3]).toUpperCase()!=='GENDER')throw Error('Column D must be GENDER.');
 const rows=[],seen=new Set();let duplicates=0;
 for(let i=1;i<grid.length;i++){
  const name=clean(grid[i][1]).toUpperCase(),school=clean(grid[i][2]).toUpperCase();
  if(!name&&!school)continue;
  if(!name||!school)throw Error(`Excel row ${i+1}: full name and school are required.`);
  if(name.length>160||school.length>160)throw Error(`Excel row ${i+1}: name and school must each be at most 160 characters.`);
  const rawGender=clean(grid[i][3]).toLowerCase(),gender=({male:'Male',female:'Female','not specified':'Not specified','':'Not specified'})[rawGender];if(!gender)throw Error(`Excel row ${i+1}: gender must be Male, Female or Not specified.`);
  const identity=JSON.stringify([name,school]);
  if(seen.has(identity)){duplicates++;continue;}seen.add(identity);rows.push({name,school,gender});
 }
 if(!rows.length)throw Error('Enter at least one student before uploading.');
 if(rows.length>400)throw Error('Upload at most 400 students per file.');
 return {rows,duplicates};
}
export async function readStudentExcel(file){
 if(!file||! /\.xlsx$/i.test(file.name))throw Error('Select an Excel .xlsx workbook.');
 if(file.size>5*1024*1024)throw Error('The Excel file must be smaller than 5 MB.');
 const XLSX=await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
 let book;try{book=XLSX.read(await file.arrayBuffer(),{type:'array',cellFormula:true,sheetRows:1002});}catch{throw Error('Cannot read this workbook. Save it as an unencrypted .xlsx file.');}
 const sheet=book.Sheets.Students;
 if(!sheet)throw Error('The workbook must have a sheet named Students. Use the download template.');
 const range=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']||'A1');
 if(range.e.r>1000)throw Error('Remove excess rows. Upload at most 400 students per file.');
 for(const [address,cell] of Object.entries(sheet))if(!address.startsWith('!')&&XLSX.utils.decode_cell(address).c<4&&cell.f)throw Error(`Cell ${address}: use plain values instead of formulas.`);
 return parseStudentRows(XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',blankrows:true,range:0}));
}
