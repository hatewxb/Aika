(()=>{
'use strict';if(window.__ourSelfStatus)return;window.__ourSelfStatus=true;
const host=window.opener||window;let req,lastDiagnostic='';
const selector=':is(._3yD46y5pd3zOGR7CzKs0mC,._2MD8aK_Q9dU8Sax4eiNYIp) :is(.avatarHolder,.nibodjvvrm86uCfnnAn4g)';
function localGameRunning(){const instance=host.SteamUIStore?.WindowStore?.MainWindowInstance;const apps=instance?.RunningApps;const game=app=>Number(app?.appid)>0&&(Number(app.app_type)&1)!==0;if(Array.isArray(apps)&&apps.some(game))return true;const library=req?.(90544)?.tw,states=req?.(76142)?.Ul;if(!library?.allApps||!states)return false;return library.allApps.some(app=>game(app)&&[states.Fi,states.Vv].includes(app.local_per_client_data?.display_status));}
function update(){try{
 if(!req&&host.webpackChunksteamui)host.webpackChunksteamui.push([['our_self_status_'+Date.now()],{},r=>{req=r}]);
 const store=req?.(17006)?.bg?.()||req?.(55239)?.xm?.FriendStore,persona=store?.self?.persona;
 const invisible=!!store?.BIsInvisibleMode?.();
 const offline=!!store?.BIsOfflineMode?.()||(!invisible&&!!persona&&!persona.is_online);
 const playing=localGameRunning()||(!offline&&!!(persona&&(persona.is_ingame||persona.m_unGamePlayedAppID>0||(!!persona.m_gameid&&String(persona.m_gameid)!=='0'))));
 const online=!invisible&&!offline&&!!persona?.is_online;
 const diagnostic=JSON.stringify({avatarCount:document.querySelectorAll(selector).length,store:!!store,invisible,playing,localApps:host.SteamUIStore?.WindowStore?.MainWindowInstance?.RunningApps?.length??null});
 if(diagnostic!==lastDiagnostic){lastDiagnostic=diagnostic;console.info('[OurSelfStatus] '+diagnostic);}
 for(const avatar of document.querySelectorAll(selector)){
  for(const [name,on]of [['our-self-invisible',invisible],['our-self-playing',playing],['our-self-online',online]])if(avatar.classList.contains(name)!==on)avatar.classList.toggle(name,on);
  const color=playing?'#a4d65e':invisible?'#b394da':online?'#66b9e8':offline?'#9299a2':null;
  const shadow=color?'0 0 0 2px '+color+', 0 0 10px '+color+'88':'none';
  if(avatar.style?.getPropertyValue('box-shadow')!==shadow){avatar.style?.setProperty('box-shadow',shadow,'important');avatar.style?.setProperty('border-radius','50%','important');}
  const title=playing?(invisible?'В игре · Невидимка (только для вас) / In game · Invisible (only you) / 游戏中 · 隐身（仅自己可见）':offline?'В игре · Не в сети (только для вас) / In game · Offline (only you) / 游戏中 · 离线（仅自己可见）':'В игре / In game / 游戏中'):invisible?'Невидимка / Invisible / 隐身':online?'В сети / Online / 在线':offline?'Не в сети / Offline / 离线':'';
  if(avatar.title!==title)avatar.title=title;
 }
}catch(e){}}
update();setInterval(()=>{if(!document.hidden)update()},1500);
})();
