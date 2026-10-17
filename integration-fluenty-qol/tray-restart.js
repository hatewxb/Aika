(()=>{
'use strict';if(window.__ourTrayRestart)return;window.__ourTrayRestart=true;
const labels={ru:'Перезапустить Steam',en:'Restart Steam',zh:'重启 Steam'};
function mount(){
 const items=[...document.querySelectorAll('.contextMenuItem,[role="menuitem"]')];
 const exit=items.find(e=>/^(Выйти из Steam|Exit Steam|退出 Steam|退出Steam)$/i.test(e.textContent.trim()));
 if(!exit||exit.parentElement.querySelector('[data-our-restart]'))return;
 const row=document.createElement('div');row.className=exit.className;row.dataset.ourRestart='1';row.setAttribute('role','menuitem');row.tabIndex=0;
 const lang=(navigator.language||'ru').slice(0,2);row.textContent=labels[lang]||labels.ru;row.title=row.textContent;
 let busy=false;
 const restart=e=>{e.preventDefault();e.stopPropagation();if(busy)return;
 const candidates=[window.SteamClient,window.opener?.SteamClient,window.parent?.SteamClient,window.opener?.opener?.SteamClient];
 const api=candidates.find(a=>typeof a?.User?.StartRestart==='function');
 if(api){busy=true;console.error('[OurTrayRestart] invoking native restart');api.User.StartRestart(false);return;}
 // The tray's restricted SteamClient object may omit User; dispatch to the loaded main client context.
 const channel=new BroadcastChannel('our-steam-restart');channel.postMessage({action:'restart',at:Date.now()});busy=true;row.textContent='Перезапуск…';setTimeout(()=>{channel.close();busy=false;row.textContent=labels[lang]||labels.ru;},3000);
 };
 row.addEventListener('click',restart);row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')restart(e)});exit.before(row);
}
let queued=false;const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount()})};const start=()=>{mount();new MutationObserver(queue).observe(document.body,{subtree:true,childList:true})};if(document.body)start();else addEventListener('DOMContentLoaded',start,{once:true});
})();
