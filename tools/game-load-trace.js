// Trace one game-page entry and the first few seconds of scripted scrolling.
// Leaves the selected game open; restores its scroll position after sampling.
const fs=require('fs'),{spawn}=require('child_process'),target=require('./target');
(async()=>{
 const ws=new WebSocket(await target('Steam'));await new Promise(r=>ws.onopen=r);
 let id=0;const pending=new Map();let traceDone;
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Tracing.tracingComplete')traceDone?.(m.params);if(pending.has(m.id)){const h=pending.get(m.id);pending.delete(m.id);m.error?h.reject(Error(JSON.stringify(m.error))):h.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const mainFrame=(await send('Page.getFrameTree')).frameTree.frame.id;
 await send('Tracing.start',{categories:'devtools.timeline,v8.execute',transferMode:'ReturnAsStream'});
 try{
  spawn('C:/Program Files (x86)/Steam/steam.exe',['steam://nav/games/details/251570'],{windowsHide:true,stdio:'ignore'}).unref();
  const samples=await ev(`new Promise(resolve=>{let first,last,top,body;const dt=[],deadline=performance.now()+12000;function frame(now){if(now>deadline){resolve({error:'page readiness timeout'});return;}const next=document.querySelector('.Body');if(!next||![...document.querySelectorAll('.ReactVirtualized__List .Selected')].some(e=>e.textContent.includes('7 Days'))){setTimeout(()=>requestAnimationFrame(frame),50);return;}if(first===undefined){first=last=now;body=next;top=body.scrollTop;}else dt.push(now-last);last=now;body.scrollTop=Math.min(body.scrollHeight-body.clientHeight,(now-first)*.8);if(now-first<5000)requestAnimationFrame(frame);else{body.scrollTop=top;dt.sort((a,b)=>a-b);resolve({median:dt[Math.floor(dt.length*.5)],p95:dt[Math.floor(dt.length*.95)],max:dt.at(-1),over50:dt.filter(t=>t>50).length,frames:dt.length});}}requestAnimationFrame(frame);})`);
  const completion=new Promise(r=>traceDone=r);await send('Tracing.end');const {stream}=await completion;
  const fd=fs.openSync('diagnostics/game-load-trace.json','w');
  try{for(;;){const chunk=await send('IO.read',{handle:stream,size:1000000});fs.writeSync(fd,chunk.base64Encoded?Buffer.from(chunk.data,'base64'):chunk.data);if(chunk.eof)break;}}finally{fs.closeSync(fd);}
  await send('IO.close',{handle:stream});
  // Trace events are newline-delimited inside traceEvents. Stream the summary
  // rather than keeping a second full copy of the trace in memory.
  const byPid=new Map();let mainPid;
  for await(const line of require('readline').createInterface({input:fs.createReadStream('diagnostics/game-load-trace.json')})){
   let e;try{e=JSON.parse(line.replace(/,$/,''));}catch{continue;}
   if(e.args?.data?.frame===mainFrame||e.args?.beginData?.frame===mainFrame)mainPid=e.pid;
   if(e.ph!=='X'||!e.dur)continue;
   if(!byPid.has(e.pid))byPid.set(e.pid,{longEvents:[],totals:{}});const group=byPid.get(e.pid);
   if(e.dur>20000&&['Layout','UpdateLayoutTree','FunctionCall','RunTask','FireAnimationFrame'].includes(e.name)){group.longEvents.push({name:e.name,ms:e.dur/1000,args:e.args});group.longEvents.sort((a,b)=>b.ms-a.ms);group.longEvents.length=Math.min(group.longEvents.length,25);}
   if(['Layout','UpdateLayoutTree','FunctionCall','Paint','Decode Image'].includes(e.name))group.totals[e.name]=(group.totals[e.name]||0)+e.dur/1000;
  }
  const summary={samples,mainFrame,mainPid,...byPid.get(mainPid)};
  fs.writeFileSync('diagnostics/game-load-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
 }finally{ws.close();}
})().catch(e=>{console.error(e);process.exit(1);});
