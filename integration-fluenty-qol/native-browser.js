(()=>{
 'use strict';const host=window.opener||window;if(host.__ourOpenSteamBrowser)return;
 let root=null,node=null,popup=null;
 function modules(){if(host.__ourSteamRequire)return host.__ourSteamRequire;const chunks=host.webpackChunksteamui;if(!chunks)throw new Error('Steam modules not ready');chunks.push([['our_native_browser_'+Date.now()],{},r=>{host.__ourSteamRequire=r;}]);return host.__ourSteamRequire;}
 host.__ourOpenSteamBrowser=()=>{
 try{
 if(root){popup?.Show?.();popup?.Focus?.();popup?.window?.focus?.();return;}
 const req=modules(),React=req(63696),DOM=req(98131),Native=req(73830).$,Provider=req(29827).ER;
 const instance=host.SteamUIStore?.WindowStore?.MainWindowInstance;
 if(!React?.createElement||!DOM?.createRoot||!Native||!instance)throw new Error('Native Steam browser unavailable');
 node=host.document.createElement('div');node.id='our-native-browser-root';node.style.cssText='position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';host.document.body.append(node);
 const close=()=>{const old=root;root=null;popup=null;setTimeout(()=>{old?.unmount();node?.remove();node=null;},0);};
 function Browser(){const[pages,setPages]=React.useState(()=>[{requestid:Date.now()%1000000000,strURL:'https://www.google.com/'}]);const[active,setActive]=React.useState(()=>pages[0].requestid);const next=React.useRef(active+1);
 const add=url=>{const id=next.current++;setPages(p=>[...p,{requestid:id,strURL:typeof url==='string'&&/^https?:/.test(url)?url:'https://www.google.com/'}]);setActive(id);};
 const remove=id=>{setPages(p=>{const remaining=p.filter(t=>t.requestid!==id);if(!remaining.length){close();return [];}if(active===id)setActive(remaining[0].requestid);return remaining;});};
 return React.createElement(Native,{appid:req(94601).w1d,strName:'OverlayBrowser_OurDesktop',strTitle:'Steam — Браузер',strHomeURL:'https://www.google.com/',rgPages:pages,activeRequestID:active,onClose:close,onCloseTab:remove,onSelectTab:setActive,onAddTab:add,onNewTab:add,onSelectNextTab:()=>{const i=pages.findIndex(p=>p.requestid===active);setActive(pages[(i+1)%pages.length].requestid);},onTabNavigate:(id,url)=>setPages(p=>p.map(t=>t.requestid===id?{...t,strURL:url}:t)),onReorderTab:(from,to)=>{if(to==null)return;setPages(p=>{const copy=[...p],tab=copy.splice(from,1)[0];copy.splice(to,0,tab);return copy;});},refPopup:p=>{popup=p;if(!p)return;const doc=p.document||p.window?.document;if(!doc)return;const base='https://millennium.host/v1/themes/Fluenty-Aika-QOL-RU/compat/';if(!doc.getElementById('our-native-tabs-style')){const link=doc.createElement('link');link.id='our-native-tabs-style';link.rel='stylesheet';link.href=base+'overlay-tabs.css';doc.head.append(link);const script=doc.createElement('script');script.type='module';script.src=base+'overlay-tabs.js';doc.head.append(script);}},bShowMin:true,bShowMax:true});}
 
 const Account=req(40618).Rh;
 const account={useActiveAccount:()=>host.App?.m_CurrentUser?.strSteamID||host.g_steamID||host.App?.m_CMInterface?.steamid?.ConvertTo64BitString?.()||''};
 let tree=React.createElement(Account,{value:account},React.createElement(Provider,{instance},React.createElement(Browser)));
 root=DOM.createRoot(node);root.render(tree);
 console.error('[OurNativeBrowser] native Steam popup requested');
 }catch(e){root=null;node?.remove();node=null;console.error('[OurNativeBrowser] '+e.stack);throw e;}
 };
})();
