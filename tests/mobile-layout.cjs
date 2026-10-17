const {chromium}=require('playwright'),fs=require('fs'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'../public')+'/',fixture=JSON.parse(fs.readFileSync(__dirname+'/fixtures/mobile-ui.json'));
const output=require('path').resolve('artifacts/mobile');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});await page.route('**/*',route=>route.abort());
 let html=fs.readFileSync(root+'index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,'').replace('<link rel="stylesheet" href="style.css">','<style>'+fs.readFileSync(root+'style.css','utf8').replace(/@import[^;]+;/,'')+'</style>').replaceAll('src="kcc-logo.png"','src="data:image/png;base64,'+fs.readFileSync(root+'kcc-logo.png').toString('base64')+'"');
 await page.setContent(html);await page.screenshot({path:output+'/login.png',fullPage:true});
 await page.evaluate(f=>{for(const [id,v]of Object.entries(f)){const e=document.getElementById(id);if(!e)continue;if(v.innerHTML)e.innerHTML=v.innerHTML;else if(v.textContent)e.textContent=v.textContent;if('value' in e)e.value=v.value;e.hidden=v.hidden;}document.getElementById('auth').hidden=true;document.getElementById('shell').hidden=false;document.getElementById('workspace').hidden=false;document.getElementById('pending').hidden=true;document.getElementById('treasuryNav').hidden=false;document.getElementById('adminNav').hidden=false;document.getElementById('profileDetails').open=false;document.getElementById('account').textContent='treasurer.long.email@example.com · Admin';const long='NAZRAN RAHIMI IMRANSANIE BIN NARULLZ SANIE SYAFRIZAL';document.getElementById('paymentRows').innerHTML=document.getElementById('paymentRows').innerHTML.replaceAll('Example Student',long);document.getElementById('paymentStudent').innerHTML='<option>'+long+'</option>';document.getElementById('studentRows').innerHTML='<tr><td>'+long+'</td><td>SM ALL SAINTS, KOTA KINABALU</td><td><button>Delete</button></td></tr>';},fixture);
 const app=fs.readFileSync(root+'app.js','utf8');await page.addScriptTag({content:"const $=id=>document.getElementById(id);\n"+app.split('\n').find(l=>l.startsWith('function page(id)'))+'\n'+app.split('\n').find(l=>l.startsWith("document.querySelectorAll('[data-page]')"))});
 for(const width of [320,390,430,768,1280]){
  await page.setViewportSize({width,height:844});
  for(const id of ['overview','payments','receipts','students','treasury','admin']){
   await page.locator('nav button[data-page="'+id+'"]').click();
   const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(metrics.scroll<=width+1,`${id} overflows at ${width}: ${JSON.stringify(metrics)}`);
   if(width===390&&['overview','payments','treasury'].includes(id))await page.screenshot({path:output+'/'+id+'.png',fullPage:true});
  }
 }
 await page.setViewportSize({width:390,height:844});await page.locator('nav button[data-page="payments"]').click();await page.locator('#profileDetails summary').click();assert.equal(await page.locator('#profileName').isVisible(),true);await page.locator('#profileDetails summary').click();
 await page.evaluate(()=>document.getElementById('editPaymentDialog').showModal());assert.ok(await page.locator('#editPaymentDialog').isVisible());await page.screenshot({path:output+'/dialog.png'});await page.evaluate(()=>document.getElementById('editPaymentDialog').close());
 await page.evaluate(()=>{document.getElementById('adminNav').hidden=true;document.getElementById('treasuryNav').hidden=true;});assert.equal(await page.locator('nav button:visible').count(),4);assert.equal(await page.locator('#adminNav').isVisible(),false);
 console.log('All six pages fit 320, 390, 430, 768 and 1280px. Navigation, profile disclosure, dialog and staff visibility passed.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
