const fs=require('fs'),target=require('./target');
fs.mkdirSync('diagnostics',{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fastCSS=`@keyframes aika-tabmenu-in {from {opacity:0;transform:translateY(-4px)}to {opacity:1;transform:none}}
html:not(.aika-linux)[class*="_Supernav"] body .contextMenu.ContextMenuPosition.ready {clip-path:none;animation:aika-tabmenu-in var(--aika-dur-fast) var(--aika-ease)}
html:not(.aika-linux)[class*="_Supernav"].aika-menu-js:not(.aika-menu-open) body .contextMenu.ContextMenuPosition.ready {animation:none;clip-path:none;opacity:0}
html:not(.aika-linux)[class*="_Supernav"] body .contextMenu.ready .contextMenuContents > :is(.contextMenuItem,hr.Separator) {animation:none;opacity:1}`;
async function connect(title){const ws=new WebSocket(await target(title));await new Promise(r=>ws.onopen=r);let id=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id);}};const send=(method,params={})=>new Promise(r=>{pending.set(++id,r);ws.send(JSON.stringify({id,method,params}));});return {ws,send,ev:async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.value};}
(async()=>{
 const main=await connect('Steam'),menus=await Promise.all(['Store Supernav','Library Supernav','Community Supernav','Profile Supernav'].map(connect));
 const results=[];
 try{
  await main.send('Performance.enable');
  const points=await main.ev(`Array.from(document.querySelectorAll('.SuperNav > .MenuWrapper')).slice(0,4).map(e=>{const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})`);
  const metrics=async()=>Object.fromEntries((await main.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  for(const variant of ['baseline','fast-popup']){
   if(variant==='fast-popup')for(const menu of menus)await menu.ev(`(()=>{const s=document.createElement('style');s.id='aika-nav-sweep-test';s.textContent=${JSON.stringify(fastCSS)};document.head.append(s);})()`);
   await main.ev(`window.__aikaNavSample={dt:[],last:0,raf:0};(()=>{const s=window.__aikaNavSample;function tick(now){if(s.last)s.dt.push(now-s.last);s.last=now;s.raf=requestAnimationFrame(tick)}s.raf=requestAnimationFrame(tick)})()`);
   const a=await metrics();
   for(let i=0;i<96;i++){const p=points[i%points.length];await main.send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await sleep(15);}
   await main.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:200,y:55});await sleep(300);
   const b=await metrics(),frames=await main.ev(`(()=>{const s=window.__aikaNavSample;cancelAnimationFrame(s.raf);s.dt.sort((a,b)=>a-b);const result={frames:s.dt.length,median:s.dt[Math.floor(s.dt.length*.5)],p95:s.dt[Math.floor(s.dt.length*.95)],max:s.dt.at(-1),over50:s.dt.filter(t=>t>50).length};delete window.__aikaNavSample;return result;})()`);
   const result={variant,...frames};for(const key of ['TaskDuration','ScriptDuration','RecalcStyleDuration','LayoutDuration'])result[key+'Ms']=Math.round((b[key]-a[key])*1000);
   results.push(result);console.log(JSON.stringify(result));
  }
  fs.writeFileSync('diagnostics/nav-sweep.json',JSON.stringify(results,null,2));
 }finally{for(const menu of menus){await menu.ev(`document.getElementById('aika-nav-sweep-test')?.remove()`);menu.ws.close();}main.ws.close();}
})();
