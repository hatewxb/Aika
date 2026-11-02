// Replace only Aika's two pointer-effect listeners without restarting Steam.
const target=require('./target');
(async()=>{const ws=new WebSocket(await target('Steam'));ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{includeCommandLineAPI:true,awaitPromise:true,returnByValue:true,expression:`(async()=>{
 const old=getEventListeners(document),removed=[];
 for(const [type,list]of Object.entries(old))for(const event of list){
  const source=event.listener.toString();
  if((type==='pointermove'&&source.includes('lastEvent = e')&&(source.includes('moveFrame')||source.includes('requestAnimationFrame(update)')))||(type==='pointerleave'&&source.includes('lastEvent = null; aim();'))){
   if(type==='pointerleave')event.listener();
   document.removeEventListener(type,event.listener,event.useCapture);removed.push(type);
  }
 }
 if(window.__aikaCoverTilt?.destroy)window.__aikaCoverTilt.destroy();else delete window.__aikaCoverTilt;
 if(window.__aikaSpotlight?.destroy)window.__aikaSpotlight.destroy();else delete window.__aikaSpotlight;
 for(const name of ['cover-tilt.js','spotlight.js'])await import('https://millennium.host/v1/themes/Aika/js/'+name+'?hot='+Date.now());
 return {removed,tilt:typeof window.__aikaCoverTilt,spotlight:typeof window.__aikaSpotlight};
})()`}}));ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id!==1)return;console.log(JSON.stringify(m.result,null,2));ws.close();};setTimeout(()=>{ws.close();process.exit(1)},10000).unref();})();
