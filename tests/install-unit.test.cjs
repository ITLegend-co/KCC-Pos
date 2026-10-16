const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('browser install manifest stays within KCC POS with valid sized icons and APK links',()=>{
 const m=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8')),base='https://itlegend-co.github.io/KCC-Pos/';
 assert.equal(new URL(m.start_url,base).href,base);assert.equal(new URL(m.scope,base).href,base);assert.equal(m.display,'standalone');
 for(const size of [192,512]){const icon=m.icons.find(i=>i.sizes===size+'x'+size),b=fs.readFileSync('public/'+icon.src);assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);}
 const html=fs.readFileSync('public/index.html','utf8');assert.match(html,/rel="manifest" href="manifest.webmanifest"/);assert.equal((html.match(/href="downloads\/KCC-POS.apk"/g)||[]).length,2);
});
test('browser registration uses project scope without a custom install prompt',async()=>{
 let load,registration;const context={window:{addEventListener:(event,fn)=>{assert.equal(event,'load');load=fn;}},navigator:{serviceWorker:{register:(path,options)=>{registration={path,options};return Promise.resolve();}}},console};
 vm.runInNewContext(fs.readFileSync('public/install.js','utf8'),context);load();assert.equal(registration.path,'./sw.js');assert.equal(registration.options.scope,'./');assert.equal(registration.options.updateViaCache,'none');
});
test('service worker never caches financial traffic and gives an offline navigation page',async()=>{
 const listeners={},origin='https://itlegend-co.github.io',response=new Response('live'),context={URL,Response,self:{location:{origin},addEventListener:(name,fn)=>listeners[name]=fn},fetch:async()=>response};vm.createContext(context);vm.runInContext(fs.readFileSync('public/sw.js','utf8'),context);
 let result,handled=false;const request={mode:'navigate',url:origin+'/KCC-Pos/'};
 listeners.fetch({request,respondWith:p=>result=p});assert.equal(await result,response);
 context.fetch=async()=>{throw Error('Offline');};listeners.fetch({request,respondWith:p=>result=p});const offline=await result;assert.equal(offline.status,503);assert.equal(offline.headers.get('cache-control'),'no-store');assert.match(await offline.text(),/Connect to the internet/);
 for(const request of [{mode:'cors',url:'https://kcc-pos-default-rtdb.asia-southeast1.firebasedatabase.app/events.json'},{mode:'same-origin',url:origin+'/KCC-Pos/downloads/KCC-POS.apk'},{mode:'navigate',url:'https://example.com/'}])listeners.fetch({request,respondWith:()=>handled=true});assert.equal(handled,false);
});
