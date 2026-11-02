// Isolated CEF fixtures: all color presets against legacy/new prices, calendar,
// labels, comments, SIH and the loading indicator. Does not change preferences.
const fs=require('fs'),target=require('./target');
const skin=JSON.parse(fs.readFileSync('skin.json'));
const presets=Object.entries(skin.Conditions['Color preset'].values).map(([name,v])=>({name,src:v.TargetCss.src}));
fs.mkdirSync('diagnostics',{recursive:true});
async function check(presets){
 const native=[...document.styleSheets].filter(s=>!s.href?.includes('/themes/Aika/')).flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText)}catch{return []}}).join('\n');
 const results=[];
 for(const preset of presets){
  const frame=document.createElement('iframe');frame.style.cssText='position:fixed;left:-10000px;top:0;width:1200px;height:700px;visibility:hidden';document.body.append(frame);
  try{
   const d=frame.contentDocument,w=frame.contentWindow;d.body.className='v6 app';
   const source=d.createElement('style');source.textContent=native;d.head.append(source);
   for(const src of ['webkit.css',preset.src])await new Promise(r=>{const l=d.createElement('link');l.rel='stylesheet';l.href='https://millennium.host/v1/themes/Aika/'+src+'?matrix=20261102';l.onload=l.onerror=r;d.head.append(l);});
   d.body.innerHTML=`<div id="StoreTemplate">
    <div class="discount_block"><div class="discount_pct" id="legacy">-50%</div></div>
    <div class="discount_block"><div class="bundle_base_discount" id="bundle">-25%</div></div>
    <div class="StoreSalePriceWidgetContainer"><div class="StoreSaleDiscountBox" id="related">-20%</div></div>
    <div class="dkW-v-f4lTw- NCJYxkuknJ0-"><div class="pnC74wQYjms-" id="outer"><div class="nw-DtQ670Sc-" id="react">-50%</div></div><div class="cQ79XIQ7w-Y-"><div class="JBijjejcvmo-">500</div></div></div>
    <div class="Cj7J5QHbL-0-"><div class="rsMD9WnTopA-" id="wishlist"><div class="hPiY1A-1izA-" id="wltext">-50%</div></div></div>
    <div class="K2UfkCIuEhY- StoreSalePriceWidgetContainer"><span class="gXsTTmkhkp8-" id="calendarprice">-15%</span><span class="r9Xd1x4Y-Ig-" id="newrelease">New</span></div>
    <div id="module_discounts_and_events"><div class="I5xcEcLqHQE-"><div class="nL4oSzmS8Ds-"><div class="jxYpM-g5fRs-" id="label">Weekend deal</div></div></div></div>
    <div class="personal_calendar_ctn"><div class="nHdn-Ea4zSg-"><div class="maxz19gKOQc- N3v3VnhKgU8-" id="day">Day</div></div></div>
    <div class="forumtopic_comments"><div class="commentthread_comment" id="comment">Comment</div></div>
    <div class="sih-info" id="sih">SIH</div>
    <div class="LoadingThrobber" id="loader"><div class="Bar Bar1"></div></div>
    <div id="ok" style="background:var(--aika-ok);color:var(--aika-bg-deep)"></div>
    <div id="card" style="background:var(--aika-card-bg)"></div>
    <div id="accent" style="background:var(--aika-accent-fill);color:var(--aika-on-accent)"></div>
    <div id="elevated" style="background:var(--aika-bg-elevated)"></div>
   </div>`;
   const css=id=>w.getComputedStyle(d.getElementById(id));const failures=[];
   const assert=(value,name)=>{if(!value)failures.push(name);};
   const expected=css('ok').backgroundColor,text=css('ok').color;
   for(const id of ['legacy','bundle','related','outer','react','wishlist','wltext','calendarprice'])assert(css(id).backgroundColor===expected,id+' discount color');
   assert(css('newrelease').backgroundColor===css('accent').backgroundColor&&css('newrelease').color===css('accent').color,'New release accent');
   assert(css('react').color===text,'React discount contrast color');assert(css('wltext').color===text,'Wishlist discount contrast color');
   assert(css('day').backgroundImage===css('card').backgroundImage,'Calendar future-day material');
   assert(css('comment').backgroundColor===css('elevated').backgroundColor,'Comment material');
   assert(css('sih').backgroundColor===css('elevated').backgroundColor,'SIH material');
   assert(css('label').borderTopLeftRadius==='999px','Event label pill');
   assert(w.getComputedStyle(d.getElementById('loader'),'::before').animationName==='aika-store-orbit','Orbit loader');
   assert(w.getComputedStyle(d.querySelector('.Bar')).display==='none','Native blue bars hidden');
   const rgb=c=>{const v=c.match(/[\d.]+/g).map(Number).slice(0,3).map(x=>x/255);return v.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);};
   const a=rgb(expected),b=rgb(text),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(contrast>=4.5,'Discount contrast >= 4.5');
   results.push({preset:preset.name,discountBackground:expected,discountText:text,contrast:+contrast.toFixed(2),failures});
  }finally{frame.remove();}
 }
 return results;
}
(async()=>{const ws=new WebSocket(await target(process.argv[2]||'желаемого'));ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:`(${check})(${JSON.stringify(presets)}).catch(e=>({error:e.stack}))`,awaitPromise:true,returnByValue:true}}));ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id!==1)return;const result=m.result?.result?.value||m;fs.writeFileSync('diagnostics/store-presets-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!Array.isArray(result)||result.some(x=>x.failures.length))process.exitCode=1;ws.close();};setTimeout(()=>{ws.close();process.exit(1)},30000).unref();})();
