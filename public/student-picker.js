export function studentPicker(input,select,getStudents,esc){
 function refresh(clear=false){const selected=clear?'':select.value,q=input.value.trim().toLowerCase();const rows=getStudents().filter(s=>!s.deleted&&(!q||(s.name+' '+s.school).toLowerCase().includes(q)));select.innerHTML='<option value="">'+(rows.length?'Select a student':'No matching students')+'</option>'+rows.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} — ${esc(s.school)}</option>`).join('');select.value=selected;}
 input.addEventListener('input',()=>refresh(true));
 return {refresh,select:id=>{input.value='';refresh();select.value=id;}};
}
