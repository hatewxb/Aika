(()=>{
'use strict';if(window.__ourBrowserMenu)return;window.__ourBrowserMenu=true;
const channel=new BroadcastChannel('our-steam-browser');
const labels={ru:'Открыть браузер',en:'Open browser',zh:'打开浏览器'};
function language(){for(const w of [window.opener,window]){try{const v=w.localStorage.getItem('our-interface-language')||w.getComputedStyle(w.document.documentElement).getPropertyValue('--our-ui-language').trim();if(labels[v])return v;}catch{}}const v=(navigator.language||'ru').slice(0,2);return labels[v]?v:'en';}
let lang=language();
function launch(){for(const w of [window,window.opener,window.parent,window.opener?.opener]){try{if(typeof w?.__ourOpenSteamBrowser==='function'){w.__ourOpenSteamBrowser();return true;}}catch(e){console.warn('[OurBrowserMenu]',e.message);}}return false;}
channel.onmessage=e=>{const data=e.data;if(!data||Math.abs(Date.now()-data.at)>5000)return;if(data.action==='open'){if(typeof (window.opener||window).__ourOpenSteamBrowser==='function')launch();}else if(data.action==='language-request'){if(typeof (window.opener||window).__ourOpenSteamBrowser==='function')channel.postMessage({action:'language',value:language(),at:Date.now()});}else if(data.action==='language'&&labels[data.value]){lang=data.value;update();}};
function update(){for(const row of document.querySelectorAll('[data-our-browser-menu]'))row.textContent=labels[lang];}
function mount(){const items=[...document.querySelectorAll('.contextMenuItem,[role="menuitem"]')];const anchor=items.find(e=>/^(Настройки|Settings|设置)$/.test(e.textContent.trim()));if(!anchor||anchor.parentElement.querySelector('[data-our-browser-menu]'))return;const row=document.createElement('div');row.className=anchor.className;row.dataset.ourBrowserMenu='1';row.setAttribute('role','menuitem');row.tabIndex=0;row.textContent=labels[lang];const run=e=>{e.preventDefault();e.stopPropagation();if(!launch())channel.postMessage({action:'open',at:Date.now()});};row.addEventListener('click',run);row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')run(e)});anchor.after(row);channel.postMessage({action:'language-request',at:Date.now()});}
addEventListener('our-language-change',()=>{lang=language();update();channel.postMessage({action:'language',value:lang,at:Date.now()});});
let pending=false;function start(){mount();new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount()})}).observe(document.body,{childList:true,subtree:true});}if(document.body)start();else addEventListener('DOMContentLoaded',start,{once:true});
})();
