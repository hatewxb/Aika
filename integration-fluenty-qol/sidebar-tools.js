(()=>{
 'use strict';if(window.__ourSidebarTools)return;window.__ourSidebarTools=true;
 const root=document.documentElement,key='our-steam-sidebar-collapsed';
 const dict={ru:{browser:'Браузер',open:'Открыть встроенный браузер Steam',hide:'Свернуть левую панель',show:'Развернуть левую панель',points:'Магазин очков',restart:'Перезапустить Steam'},en:{browser:'Browser',open:'Open Steam browser',hide:'Collapse sidebar',show:'Expand sidebar',points:'Points Shop',restart:'Restart Steam'},zh:{browser:'浏览器',open:'打开 Steam 浏览器',hide:'收起侧边栏',show:'展开侧边栏',points:'点数商店',restart:'重启 Steam'}};
 const navWords={ru:{store:'Магазин',library:'Библиотека',collections:'Коллекции',community:'Сообщество',market:'Торговая площадка',activity:'Активность',news:'Новости',calendar:'Календарь',downloads:'Загрузки',friends:'Друзья',settings:'Настройки',back:'Назад'},en:{store:'Store',library:'Library',collections:'Collections',community:'Community',market:'Market',activity:'Activity',news:'News',calendar:'Calendar',downloads:'Downloads',friends:'Friends',settings:'Settings',back:'Back'},zh:{store:'商店',library:'库',collections:'收藏',community:'社区',market:'市场',activity:'动态',news:'新闻',calendar:'日历',downloads:'下载',friends:'好友',settings:'设置',back:'返回'}};
 function words(){const raw=getComputedStyle(root).getPropertyValue('--our-ui-language').trim();const steamLang=new URLSearchParams(location.search).get('LANGUAGE');const automatic=({russian:'ru',english:'en',schinese:'zh',tchinese:'zh'})[steamLang]||(navigator.language||'ru').slice(0,2);const lang=raw&&raw!=='Auto'?raw:automatic;return {...(dict[lang]||dict.en),nav:navWords[lang]||navWords.en};}
 let collapsed=false;try{collapsed=localStorage.getItem(key)==='1'}catch{}
 const svg=(path)=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${path}</svg>`;
 const globe=svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>');
 const arrow=svg('<path d="m14 6-6 6 6 6"/>');
 function apply(){root.classList.toggle('our-sidebar-collapsed',collapsed);document.getElementById('our-sidebar-restore')?.setAttribute('aria-expanded',String(!collapsed));}
 function toggle(){collapsed=!collapsed;if(collapsed)document.getElementById('our-glass-dialog')?.remove();apply();window.dispatchEvent(new Event('resize'));setTimeout(()=>{try{localStorage.setItem(key,collapsed?'1':'0')}catch{}},0);}
 let sawPinDialog=false,refreshStore=false,refreshTimer=0;
 function refreshStoreView(){
  if(!refreshStore)return;
  try{const m=window.opener?.MainWindowBrowserManager||window.MainWindowBrowserManager;
   const url=m?.DisplayURL||m?.m_browser?.m_URL||'';
   if(/^https:\/\/store\.steampowered\.com\//.test(url)&&typeof m.Reload==='function'){
    refreshStore=false;m.Reload();
   }
  }catch{}
 }
 function syncStore(){
  const present=!!document.querySelector('.aika-pin-host');
  if(sawPinDialog&&!present){refreshStore=true;clearTimeout(refreshTimer);refreshTimer=setTimeout(refreshStoreView,500);}
  sawPinDialog=present;
 }
 document.addEventListener('click',e=>{
  if(!refreshStore||!e.target.closest?.('#store'))return;
  clearTimeout(refreshTimer);refreshTimer=setTimeout(refreshStoreView,700);
 },true);
 // A navigation may complete after the click; retry only once, never reload-loop.
 addEventListener('focus',()=>{if(refreshStore){clearTimeout(refreshTimer);refreshTimer=setTimeout(refreshStoreView,500);}});
 function mount(){
  const bar=document.getElementById('sidebar');if(!bar)return;
  if(!bar.querySelector('#our-sidebar-tools')){
   const tools=document.createElement('div');tools.id='our-sidebar-tools';
   const browser=document.createElement('button');browser.type='button';browser.id='our-steam-browser';browser.title='Открыть браузер внутри Steam';browser.setAttribute('aria-label',browser.title);browser.innerHTML=globe+'<span>Браузер</span>';
   const launch=()=>{try{const host=window.opener||window;if(!host.__ourOpenSteamBrowser)throw new Error('Steam browser is not ready');host.__ourOpenSteamBrowser();}catch(e){browser.title='Не удалось открыть браузер Steam: '+e.message;console.error('[OurNativeBrowser button] '+e.message);}};browser.addEventListener('click',launch);browser.addEventListener('auxclick',e=>{if(e.button===1){e.preventDefault();launch();}});
   const hide=document.createElement('button');hide.type='button';hide.id='our-sidebar-hide';hide.title='Свернуть левую панель';hide.setAttribute('aria-label',hide.title);hide.innerHTML=arrow;hide.addEventListener('click',toggle);
   const points=document.createElement('button');points.type='button';points.id='our-points-shop';points.innerHTML=svg('<circle cx="12" cy="12" r="9"/><path d="m12 6 1.8 3.7 4.1.6-3 2.9.7 4.1-3.6-1.9-3.6 1.9.7-4.1-3-2.9 4.1-.6Z"/>')+'<span></span>';points.addEventListener('click',()=>{const m=window.opener?.MainWindowBrowserManager||window.MainWindowBrowserManager;m?.ShowURL('https://store.steampowered.com/points/shop/');});
   tools.append(document.getElementById('our-points-shop')||points,document.getElementById('our-steam-browser')||browser,hide);bar.append(tools);
  }
  if(!document.getElementById('our-sidebar-restore')){
   const restore=document.createElement('button');restore.type='button';restore.id='our-sidebar-restore';restore.title='Развернуть левую панель';restore.setAttribute('aria-label',restore.title);restore.setAttribute('aria-controls','sidebar');restore.innerHTML=arrow;restore.addEventListener('click',toggle);document.body.append(restore);
  }
  const bottom=bar.querySelector(':scope > .section:nth-child(2)');
  const tools=bar.querySelector('#our-sidebar-tools');
  if(bottom&&tools&&tools.parentElement!==bottom)bottom.append(tools);
  if(bottom){
   const downloads=bottom.querySelector('#downloads'),settings=bottom.querySelector('#settings');
   const points=bar.querySelector('#our-points-shop');
   const add=document.querySelector('.AddGameButton,._2foCkpRXhqq0UGVE50BWqj');
   if(add){let footer=bar.querySelector('#our-add-game-footer');if(!footer){footer=document.createElement('div');footer.id='our-add-game-footer';bar.append(footer)}add.dataset.ourAddGame='1';if(add.parentElement!==footer)footer.append(add);}
   if(points&&downloads&&points.parentElement!==bottom)bottom.insertBefore(points,downloads);
   const browser=bar.querySelector('#our-steam-browser');
   if(browser&&settings&&browser.nextElementSibling!==bar.querySelector('#our-language-quick'))bottom.insertBefore(browser,settings);
   const language=bar.querySelector('#our-language-quick');
   if(language&&settings&&language.nextElementSibling!==settings)bottom.insertBefore(language,settings);
  }
  const w=words();for(const [id,text,key]of [['our-steam-browser',w.browser,'open'],['our-sidebar-hide','‹','hide'],['our-sidebar-restore','›','show'],['our-points-shop',w.points,'points'],['our-steam-restart','↻','restart']]){const el=document.getElementById(id);if(!el)continue;el.title=w[key];el.setAttribute('aria-label',w[key]);const span=el.querySelector('span');if(span&&span.textContent!==text)span.textContent=text;}
  for(const [id,text]of Object.entries(w.nav)){const el=bar.querySelector('#'+id);if(!el)continue;el.title=text;const label=el.querySelector('.text');if(label&&label.textContent!==text)label.textContent=text;}
  apply();
 }
 let pending=false;const queue=()=>{if(pending)return;pending=true;setTimeout(()=>{pending=false;if(!document.hidden){syncStore();mount()}},120)};
 const start=()=>{syncStore();mount();new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.id==='sidebar'||n.id==='our-sidebar-tools'||n.id==='our-language-quick'||n.matches?.('.AddGameButton,._2foCkpRXhqq0UGVE50BWqj')||n.matches?.('.aika-pin-host,.FullModalOverlay')||n.querySelector?.('#sidebar,#our-sidebar-tools,.aika-pin-host,.FullModalOverlay')))))queue()}).observe(document.body,{childList:true,subtree:true});addEventListener('our-language-change',queue)};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});
 addEventListener('focus',queue);
 if(document.body)start();else addEventListener('DOMContentLoaded',start,{once:true});
})();
