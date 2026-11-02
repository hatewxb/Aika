// Temporary CDP experiments; restores stylesheet text and scroll position.
// node tools/scroll-perf.js [main|list] [seconds=3] [quick]
const target = require('./target');
const fs = require('node:fs');
const pane = process.argv[2] || 'main';
const seconds = Number(process.argv[3] || 3);
(async () => {
  const ws = new WebSocket(await target('Steam'));
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map(), sheets = [];
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    if (m.method === 'CSS.styleSheetAdded') sheets.push(m.params.header);
    if (pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id; pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const ev = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  await send('DOM.enable'); await send('CSS.enable'); await send('Performance.enable');
  const base = sheets.find(s => s.sourceURL.includes('/Aika/base.css'));
  if (!base) throw new Error('Aika base.css not found');
  const original = (await send('CSS.getStyleSheetText', { styleSheetId: base.styleSheetId })).text;
  const noScroll = original.replace(/[^{}]*::-webkit-scrollbar[^{}]*\{[^{}]*\}/g, '');
  const oldSelectors = original.replace(/:root::-/g, '::-').replace(/:root ::-/g, '::-');
  console.log(JSON.stringify(await ev(`(() => {
    const el = ${pane === 'list' ? "document.querySelector('.ReactVirtualized__List')" : "[...document.querySelectorAll('.Body')].find(e=>e.clientHeight>200 && e.scrollHeight>e.clientHeight+100)"};
    if (!el) throw new Error('Scrollable pane not found');
    window.__aikaScrollBench = { el, top:el.scrollTop, behavior:el.style.scrollBehavior };
    el.style.scrollBehavior='auto';
    return {pane:${JSON.stringify(pane)}, height:el.clientHeight, total:el.scrollHeight, visible:document.visibilityState};
  })()`)));
  let variants = [
    ['baseline', original, ''],
    ['old-scroll-selectors', oldSelectors, ''],
    ['no-theme-scrollbar', noScroll, ''],
    ['no-background', original, 'html::before,html::after,body::before,body::after{display:none!important}'],
    ['no-backdrop-blur', original, '*,*::before,*::after{backdrop-filter:none!important}'],
    ['baseline-repeat', original, ''],
  ];
  if (process.argv[4] === 'quick') variants = [variants[0], variants.at(-1)];
  const results = [];
  try {
    for (const [name, text, css] of variants) {
      await send('CSS.setStyleSheetText', { styleSheetId:base.styleSheetId, text });
      await ev(`document.getElementById('aika-scroll-experiment')?.remove(); (()=>{const s=document.createElement('style');s.id='aika-scroll-experiment';s.textContent=${JSON.stringify(css)};document.head.append(s)})(); window.__aikaScrollBench.el.scrollTop=0;`);
      await new Promise(r => setTimeout(r, 650));
      await ev(`if(!window.__aikaScrollBench.el.isConnected)window.__aikaScrollBench.el=${pane==='list' ? "document.querySelector('.ReactVirtualized__List')" : "[...document.querySelectorAll('.Body')].find(e=>e.clientHeight>200&&e.scrollHeight>e.clientHeight+100)"}`);
      const a = await metrics();
      const frames = await ev(`new Promise(resolve => {
        const el=window.__aikaScrollBench.el, dt=[];
        const max=Math.min(el.scrollHeight-el.clientHeight,2400);
        let start, last;
        function frame(now) {
          if(start===undefined) start=last=now;
          else dt.push(now-last);
          last=now;
          const t=now-start, phase=(t/1000*1000)%(max*2);
          el.scrollTop=phase<max?phase:max*2-phase;
          if(t<${seconds*1000}) requestAnimationFrame(frame);
          else {dt.sort((a,b)=>a-b);resolve({connected:el.isConnected,height:el.clientHeight,total:el.scrollHeight,frames:dt.length,median:dt[Math.floor(dt.length*.5)],p95:dt[Math.floor(dt.length*.95)],max:dt.at(-1),over16:dt.filter(x=>x>16.7).length,over50:dt.filter(x=>x>50).length,scrollTop:el.scrollTop});}
        }
        requestAnimationFrame(frame);
      })`);
      const b = await metrics();
      const row = {name,...frames};
      for(const k of ['TaskDuration','ScriptDuration','RecalcStyleDuration','LayoutDuration']) row[k+'Ms']=Math.round((b[k]-a[k])*1000);
      results.push(row); console.log(JSON.stringify(row));
    }
    fs.mkdirSync("diagnostics", {recursive:true});
    fs.writeFileSync(`diagnostics/scroll-perf-${pane}.json`, JSON.stringify({pane,date:new Date().toISOString(),seconds,results},null,2));
  } finally {
    await send('CSS.setStyleSheetText', { styleSheetId:base.styleSheetId, text:original });
    await ev(`document.getElementById('aika-scroll-experiment')?.remove();if(window.__aikaScrollBench){const b=window.__aikaScrollBench;b.el.scrollTop=b.top;b.el.style.scrollBehavior=b.behavior;delete window.__aikaScrollBench;}`);
    ws.close();
  }
})().catch(e=>{console.error(e);process.exit(1);});
