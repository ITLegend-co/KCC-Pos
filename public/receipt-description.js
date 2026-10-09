export function categoryLabel(category){return category==='insurance'?'INSURANCE FEE - ALLIANZ STUDENT PERSONAL ACCIDENT':'SPORT CLIMBING TRAINING FEES';}
export function paymentDescription(r){
 const title=r.category==='insurance'?categoryLabel('insurance'):categoryLabel('training')+' - '+new Date(r.month+'-01T00:00:00').toLocaleDateString('en-MY',{month:'long',year:'numeric'}).toUpperCase();
 return title+'\n'+r.school;
}
