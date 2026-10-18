const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync('public/platform.js','utf8');
function setup(userAgent,standalone=false){
 const links=[{hidden:true},{hidden:true}],handlers={};
 const context={navigator:{userAgent},document:{readyState:'complete',querySelectorAll:()=>links,addEventListener:()=>{}},window:{matchMedia:()=>({matches:standalone,addEventListener:()=>{}}),addEventListener:(name,fn)=>handlers[name]=fn},setTimeout:()=>0,alert:()=>{}};
 vm.runInNewContext(code,context);return {links,handlers,platform:context.window.KCCPlatform};
}
test('APK links appear only in Android browsers, never desktop, iPhone, native app or installed PWA',()=>{
 for(const [ua,standalone,visible] of [['Mozilla Windows',false,false],['Mozilla iPhone',false,false],['Mozilla Android Chrome',false,true],['Mozilla Android Chrome KCCPOS/2',false,false],['Mozilla Android Chrome',true,false]])assert.equal(setup(ua,standalone).links.every(l=>!l.hidden),visible,ua);
});
test('native print messages use the handed-off port; ordinary browsers do not send',async()=>{
 const app=setup('Android KCCPOS/2');let sent;
 app.handlers.message({data:'kcc-native-ready',ports:[{postMessage:v=>sent=JSON.parse(v)}]});
 assert.equal(await app.platform.printHtml('<h1>Report</h1>','Report'),true);
 assert.deepEqual(sent,{action:'html',name:'Report',data:'<h1>Report</h1>'});
 assert.equal(await setup('Android Chrome').platform.printHtml('x','x'),false);
});
