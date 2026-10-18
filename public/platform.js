/* Native messages use a port delivered only to the trusted top-level app page. */
(() => {
 const native = /KCCPOS\/2\b/.test(navigator.userAgent);
 let port;
 const ready = new Promise(resolve => window.addEventListener('message', event => {
  if (!native || event.data !== 'kcc-native-ready' || !event.ports[0]) return;
  port = event.ports[0];
  port.onmessage = e => { try { const m=JSON.parse(e.data); if(m.error) alert(m.error); } catch {} };
  resolve();
 }));
 async function send(message) {
  if (!native) return false;
  await Promise.race([ready, new Promise((_,reject)=>setTimeout(()=>reject(Error('The app connection is not ready. Close and reopen KCC POS.')),10000))]);
  port.postMessage(JSON.stringify(message)); return true;
 }
 async function file(blob,name,action='save') {
  if(blob.size>15*1024*1024)throw Error('This file is too large to export in the app.');
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
  return send({action,name,type:blob.type.split(';')[0],data});
 }
 window.KCCPlatform={native,file,printHtml:(html,name)=>send({action:'html',name,data:html})};
 function links(){
  const standalone=window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  document.querySelectorAll('.apk-download').forEach(a=>a.hidden=!( /Android/i.test(navigator.userAgent) && !native && !standalone));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',links);else links();
 window.matchMedia('(display-mode: standalone)').addEventListener?.('change',links);
 document.addEventListener('click',async e=>{
  const a=e.target.closest?.('a[download]');
  if(!native || !a)return;
  e.preventDefault();
  try {const response=await fetch(a.href);if(!response.ok)throw Error('Unable to download this file.');await file(await response.blob(),a.download || new URL(a.href).pathname.split('/').pop());}catch(error){alert(error.message);}
 });
})();
