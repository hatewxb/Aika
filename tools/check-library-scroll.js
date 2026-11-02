// Live integration check. Steam -dev; open library and the scroll preview first.
const target = require('./target');
const fs = require('node:fs');
(async () => {
  const ws = new WebSocket(await target('Steam'));
  await new Promise(r => ws.onopen = r);
  ws.onmessage = ({data}) => {
    const m = JSON.parse(data);
    if (m.id !== 1) return;
    fs.mkdirSync('diagnostics', {recursive:true});
    fs.writeFileSync('diagnostics/scroll-modes-check.json', JSON.stringify(m.result,null,2));
    console.log(JSON.stringify(m.result,null,2));
    ws.close();
    if (m.error || m.result?.exceptionDetails) process.exitCode = 1;
  };
  ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{awaitPromise:true,returnByValue:true,expression:`(async () => {
    const pane = document.querySelector('.LeftListSizableContainer .ReactVirtualized__List');
    const initial = pane.scrollTop;
    const body = [...document.querySelectorAll('.Body')].find(e=>e.clientHeight>200&&e.scrollHeight>e.clientHeight+100);
    const bodyTop = body?.scrollTop;
    const sleep = ms => new Promise(r=>setTimeout(r,ms));
    const choose = m => document.querySelector('.aika-scroll-preview [data-mode='+m+']').click();
    const wheel = (el,delta,extra={}) => {
      const e=new WheelEvent('wheel',{deltaY:delta,bubbles:true,cancelable:true,...extra});
      el.dispatchEvent(e);return e.defaultPrevented;
    };
    const assert = (ok, message) => {if(!ok)throw Error(message)};
    const results=[];
    try {
      for (const mode of ['Standard','Soft','Cinematic']) {
        choose(mode);pane.scrollTop=4000;await sleep(100);
        const start=pane.scrollTop, t=performance.now(), prevented=wheel(pane,240), samples=[];
        for(const wait of [40,60,200,700]) {
          await sleep(wait);
          samples.push({ms:Math.round(performance.now()-t),offset:+(pane.scrollTop-start).toFixed(2)});
        }
        results.push({mode,prevented,samples});
        assert(prevented===(mode!=='Standard'),mode+' interception');
        assert(mode==='Standard'||Math.abs(pane.scrollTop-start-240)<2,mode+' final distance');
        const settled=pane.scrollTop;await sleep(100);
        assert(pane.scrollTop===settled,mode+' did not settle');
      }
      assert(results[1].samples[1].offset>results[2].samples[1].offset,'Modes have indistinguishable easing');
      choose('Soft');pane.scrollTop=4000;await sleep(60);wheel(pane,360);await sleep(40);
      const before=pane.scrollTop;wheel(pane,-180);await sleep(80);
      assert(pane.scrollTop<before,'Reverse direction');results.push({check:'reverse',passed:true});
      choose('Soft');pane.scrollTop=4000;await sleep(60);wheel(pane,300);await sleep(25);
      pane.scrollTop=6000;await sleep(400);
      assert(Math.abs(pane.scrollTop-6000)<2,'External scroll cancelled');
      results.push({check:'external scroll',passed:true});
      assert(!wheel(pane,240,{ctrlKey:true}),'Zoom intercepted');
      assert(!wheel(pane,240,{shiftKey:true}),'Shift wheel intercepted');
      assert(!body||!wheel(body,240),'Game page wheel intercepted');
      assert(!body||body.scrollTop===bodyTop,'Game page moved');
      results.push({check:'zoom, shift, page scope',passed:true});
      choose('Soft');pane.scrollTop=0;await sleep(60);
      assert(!wheel(pane,-120),'Boundary wheel swallowed');
      results.push({check:'boundary chaining',passed:true});
      choose('Cinematic');pane.scrollTop=4000;await sleep(100);
      const rect=pane.getBoundingClientRect();
      wheel(pane,720,{clientX:rect.left+130,clientY:rect.top+250});await sleep(70);
      const blur=document.querySelector('.aika-scroll-trails');
      assert(blur&&!blur.hidden&&+getComputedStyle(blur).opacity>0,'Fast cinematic trails missing');
      assert(getComputedStyle(blur).pointerEvents==='none','Trails block input');
      const bounds=blur.getBoundingClientRect();
      assert(bounds.left>=rect.left-1&&bounds.right<=rect.right&&bounds.top>=rect.top-1&&bounds.bottom<=rect.bottom+1,'Trails outside list');
      pane.dispatchEvent(new PointerEvent('pointermove',{clientX:rect.left+220,clientY:rect.top+420,bubbles:true}));
      await sleep(50);
      assert(blur.style.getPropertyValue('--aika-scroll-focus-x')==='220px','Blur focus X');
      assert(blur.style.getPropertyValue('--aika-scroll-focus-y')==='420px','Blur focus Y');
      await sleep(450);
      assert(!blur.hidden&&+getComputedStyle(blur).opacity>0,'Trails disappear before deceleration ends');
      await sleep(1000);assert(blur.hidden,'Trails stay visible at rest');
      results.push({check:'cinematic trails, focus, bounds, input, idle',passed:true});
      choose('Soft');wheel(pane,720);await sleep(50);
      assert(blur.hidden,'Soft mode blurred');choose('Soft');
      const root=document.documentElement;
      const value=root.style.getPropertyValue('--aika-motion'), priority=root.style.getPropertyPriority('--aika-motion');
      try {
        root.style.setProperty('--aika-motion','0');
        assert(!wheel(pane,120),'Low performance intercepted');
        results.push({check:'low performance fallback',passed:true});
      } finally {
        if(value)root.style.setProperty('--aika-motion',value,priority);else root.style.removeProperty('--aika-motion');
      }
      return results;
    } finally {choose('Soft');pane.scrollTop=initial;}
  })()`}}));
})().catch(e=>{console.error(e);process.exit(1)});
