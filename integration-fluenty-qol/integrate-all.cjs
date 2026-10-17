if(!process.env.AIKA_REVIEW_THEMES)throw new Error('Run node build-review.cjs with explicit local input paths');
const fs=require('fs'),path=require('path');
const base=process.env.AIKA_REVIEW_THEMES,out=base+'/Fluenty-Aika-QOL-RU',dst=out+'/compat/aika',src=base+'/Aika';
fs.mkdirSync(dst,{recursive:true});
for(const ent of fs.readdirSync(src,{withFileTypes:true})){
 if(['screenshots','tools','.git'].includes(ent.name))continue;
 if(ent.isDirectory()||/\.(css|md)$/.test(ent.name))fs.cpSync(src+'/'+ent.name,dst+'/'+ent.name,{recursive:true});
}
const read=p=>fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'');const write=(p,s)=>fs.writeFileSync(p,s);
const sp=read(process.env.AIKA_REVIEW_STEAM_UI),aliases={};for(const m of sp.matchAll(/\b([A-Za-z][A-Za-z0-9_]*):"([_A-Za-z0-9-]+)"/g)){if(m[2].length>=12&&m[2].length<=65)(aliases[m[1]]??=new Set()).add(m[2]);}
function alias(t){return t.replace(/\.([A-Z][A-Za-z0-9_]+)/g,(w,k)=>aliases[k]?':is('+[w,...[...aliases[k]].slice(0,8).map(x=>'.'+x)].join(',')+')':w)}
// Add aliases only to stylesheet selectors and JS selector strings, preserving files/imports.
for(const dir of ['components','sections','options']){const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=d+'/'+e.name;if(e.isDirectory())walk(p);else if(p.endsWith('.css'))write(p,alias(read(p)));}};walk(dst+'/'+dir);}
for(const f of ['pin-slots.js','fab.js','menu-motion.js','menu-gap.js'])write(dst+'/js/'+f,alias(read(dst+'/js/'+f)));
let pin=read(dst+'/js/pin-slots.js');
pin=pin.replace('requestAnimationFrame(tick);','setTimeout(tick, document.hidden ? 1000 : 200);');
pin=pin.replace('shown = Math.min(input.value.length, DIGITS);', 'input.addEventListener("input", () => { const len=Math.min(input.value.length,DIGITS); render(len,shown-len>1); shown=len; });\n    shown = Math.min(input.value.length, DIGITS);');
write(dst+'/js/pin-slots.js',pin);
let input=read(src+'/components/input.css');input=input.slice(input.indexOf('/* The PIN field'));
write(dst+'/pin.css',alias(input));
let lib=read(src+'/sections/library.css');const from=lib.indexOf('/* The notice',lib.indexOf('The bottom panel'));
const floatingStart=lib.indexOf('html .OuterFrame {',lib.indexOf('The bottom panel'));
const floatingEnd=lib.indexOf('/* The nickname',floatingStart);
write(dst+'/floating.css',alias(lib.slice(floatingStart,floatingEnd)));
write(dst+'/foundation.css','@import url("root-colors.css");\n@import url("colors.css");\n@import url("tokens.css");\n:root{--aika-font-ui:Arial,sans-serif;--aika-accent:#c297ff;--aika-accent-fill:#8559c9;--aika-accent-bright:#dec5ff}\n');
write(dst+'/client-effects.css','@import url("foundation.css");\n@import url("pin.css");\n@import url("floating.css");\n@import url("components/progress.css");\n@import url("components/card.css");\n');
// The legacy login stylesheet competes with this dedicated loading-card stylesheet.
write(dst+'/login.css','@import url("foundation.css");\n@import url("components/window.css");\n@import url("sections/login.css");\n');
write(dst+'/popup.css','@import url("foundation.css");\n@import url("components/menu.css");\n');
// Fail open: a CSP-blocked script must never hide the native game header.
let cine=read(dst+'/options/store-cinematic.css').replaceAll('html:not(.aika-cine-off) body.v6','html.aika-cine body.v6');
cine=cine.slice(0,cine.indexOf('/* Until the hero'));
write(dst+'/options/store-cinematic.css',cine);
const skin=JSON.parse(read(out+'/skin.json')),aika=JSON.parse(read(src+'/skin.json'));
skin.Patches=skin.Patches.filter(p=>!(/loginView|viewGame\.(css|js)|compat\/menu-motion/.test((p.TargetCss||'')+' '+(p.TargetJs||''))));
// Keep client chrome/side navigation from Fluenty. Aika owns the web effect surfaces.
write(out+'/compat/web-effects.css','@import url("aika/webkit.css");\n@import url("release-date.css");\n');
skin.webkitCSS='compat/web-effects.css';skin['Steam-WebKit']='compat/web-effects.css';
skin.Patches.push({MatchRegexString:'^https://(store\\.steampowered|steamcommunity)\\.com/.*',TargetCss:'compat/web-effects.css'});
for(const p of aika.Patches){if(p.MatchRegexString==='^Steam$'||p.TargetCss==='main.css')continue;
 const q=structuredClone(p);for(const k of ['TargetCss','TargetJs'])if(q[k])q[k]='compat/aika/'+q[k];skin.Patches.push(q);
}
skin.Patches.push({MatchRegexString:'^Steam$',TargetCss:'compat/aika/client-effects.css'});
const main=read(out+'/compat/main.js');write(out+'/compat/main.js',main+'\nimport "./aika/js/pin-slots.js";\nimport "./aika/js/fab.js";\nimport "./aika/js/menu-gap.js";\n');
write(out+'/libraryroot.custom.css','@import url("./compat/aika/client-effects.css");\n'+read(out+'/libraryroot.custom.css'));
const skip=new Set(['Расположение верхних вкладок','Компактная шапка','Показывать кошелёк','Показывать «Что нового»','Показывать добавление полки','Показывать новости Steam','Анимация обложек','Свечение под курсором']);
function prefix(o){if(!o||typeof o!=='object')return;for(const[k,v]of Object.entries(o))if(k==='src'&&typeof v==='string')o[k]='compat/aika/'+v;else prefix(v);}
for(const[k,v]of Object.entries(aika.Conditions)){if(skip.has(k))continue;const c=structuredClone(v);prefix(c);c.tab='Aika — '+c.tab;skin.Conditions['Aika: '+k]=c;}
fs.copyFileSync(__dirname+'/sidebar-tools.js',out+'/compat/sidebar-tools.js');
fs.copyFileSync(__dirname+'/sidebar-tools.css',out+'/compat/sidebar-tools.css');
write(out+'/compat/main.js',read(out+'/compat/main.js')+'\nimport "./sidebar-tools.js";\n');
write(out+'/libraryroot.custom.css','@import url("./compat/sidebar-tools.css");\n'+read(out+'/libraryroot.custom.css'));
skin.Patches.push({MatchRegexString:'^Steam$',TargetCss:'compat/sidebar-tools.css'});
write(out+'/compat/fast-motion.css',':root{--aika-dur-enter:180ms!important;--aika-dur-base:160ms!important;--aika-dur-fast:100ms!important;--aika-stagger:20ms!important;--aika-boot-min:150!important;--aika-boot-limit:2500!important;--aika-boot-fade:180ms!important;--aika-curtain-in:80!important;--aika-curtain-out:140!important;--aika-curtain-wait:250!important}\nhtml:root #sidebar{transition:none!important}');
skin.Patches.push({MatchRegexString:'.*',TargetCss:'compat/fast-motion.css'});
write(out+'/libraryroot.custom.css','@import url("./compat/fast-motion.css");\n'+read(out+'/libraryroot.custom.css'));
const languages={Auto:'Auto / Авто / 自动',ru:'Русский',en:'English',zh:'中文（简体）'};
skin.Conditions['Язык нашего интерфейса / Interface language / 界面语言']={tab:'Язык интерфейса / Interface language / 界面语言',default:languages.Auto,values:{}};
for(const [k,v]of Object.entries(languages)){write(out+'/compat/language-'+k+'.css',':root{--our-ui-language:'+k+'}');skin.Conditions['Язык нашего интерфейса / Interface language / 界面语言'].values[v]={TargetCss:{affects:['^Steam$'],src:'compat/language-'+k+'.css'}};}
skin.Conditions['Прозрачность панелей / Panel transparency / 面板透明度']={tab:'Язык интерфейса / Interface language / 界面语言',description:'Прозрачность внутренних панелей. Прозрачность до рабочего стола зависит от поддержки окна Steam.',default:'Выключено / Off / 关闭',values:{'Выключено / Off / 关闭':{}}};
for(const n of [25,50,75]){write(out+'/compat/transparency-'+n+'.css',':root{--our-panel-alpha:'+(1-n/100)+'}html:root #sidebar,html:root .Showcase,html:root ._3x1HklzyDs4TEjACrRO2tB{background:rgba(31,29,35,var(--our-panel-alpha))!important}');skin.Conditions['Прозрачность панелей / Panel transparency / 面板透明度'].values[n+'%']={TargetCss:{affects:['^Steam$'],src:'compat/transparency-'+n+'.css'}};}
fs.copyFileSync(__dirname+'/settings-language.js',out+'/compat/settings-language.js');
write(out+'/compat/main.js',read(out+'/compat/main.js')+'\nimport "./settings-language.js";\n');
fs.copyFileSync(__dirname+'/overlay-tabs.js',out+'/compat/overlay-tabs.js');
fs.copyFileSync(__dirname+'/overlay-tabs.css',out+'/compat/overlay-tabs.css');
skin.Patches=skin.Patches.filter(p=>!(p.MatchRegexString.includes('OverlayBrowser')&&p.TargetCss==='src/styles/overlay/Browser.css'));
skin.Patches.push({MatchRegexString:'OverlayBrowser_.*',TargetCss:'compat/overlay-tabs.css',TargetJs:'compat/overlay-tabs.js'});
skin.Conditions['Блюр панелей / Panel blur / 面板模糊']={tab:'Язык интерфейса / Interface language / 界面语言',default:'12 px',values:{}};
for(const n of [0,8,12,20,32]){write(out+'/compat/blur-'+n+'.css',':root{--our-panel-blur:'+n+'px}html:root #sidebar,html:root .Showcase{backdrop-filter:blur(var(--our-panel-blur))!important}');skin.Conditions['Блюр панелей / Panel blur / 面板模糊'].values[n+' px']={TargetCss:{affects:['^Steam$','OverlayBrowser_.*'],src:'compat/blur-'+n+'.css'}};}
write(out+'/compat/transparency-100.css',':root{--our-panel-alpha:0}html:root #sidebar,html:root .Showcase,html:root ._3x1HklzyDs4TEjACrRO2tB{background:transparent!important}');
skin.Conditions['Прозрачность панелей / Panel transparency / 面板透明度'].values['100%']={TargetCss:{affects:['^Steam$','OverlayBrowser_.*'],src:'compat/transparency-100.css'}};
for(const v of Object.values(skin.Conditions['Прозрачность панелей / Panel transparency / 面板透明度'].values))if(v.TargetCss)v.TargetCss.affects.push('OverlayBrowser_.*');
fs.copyFileSync(__dirname+'/native-browser.js',out+'/compat/native-browser.js');
write(out+'/compat/main.js',read(out+'/compat/main.js')+'\nimport "./native-browser.js";\n');
fs.copyFileSync(__dirname+'/glass-controls.js',out+'/compat/glass-controls.js');
write(out+'/compat/main.js',read(out+'/compat/main.js')+'\nimport "./glass-controls.js";\n');
skin.Patches.push({MatchRegexString:'OverlayBrowser_.*',TargetJs:'compat/glass-controls.js'});
// A single compositor-friendly startup reveal replaces the per-frame clip-path simulation.
write(out+'/compat/boot-reveal.js',`(()=>{const shared=window.opener||window;if(shared.__ourFastBoot)return;shared.__ourFastBoot=true;const run=()=>{const veil=document.createElement('div');veil.setAttribute('aria-hidden','true');veil.style.cssText='position:fixed;inset:0;z-index:2147482000;background:#211829;pointer-events:none;contain:strict';document.body.append(veil);const a=veil.animate([{opacity:.8},{opacity:0}],{duration:240,easing:'ease-out',fill:'forwards'});a.onfinish=()=>veil.remove();setTimeout(()=>veil.remove(),600);};if(document.body)run();else addEventListener('DOMContentLoaded',run,{once:true});})();`);
skin.version='1.17.0-local.9';skin.description='Fluenty: интерфейс клиента. Aika: анимации, загрузка, магазин, поиск, желаемое, меню и уведомления. QOL: единые переключатели видимости.';
// User removed transparency controls and effects on 2026-10-17.
for(const key of Object.keys(skin.Conditions))if(key.startsWith('Прозрачность панелей /')||key.startsWith('Блюр панелей /'))delete skin.Conditions[key];
skin.Patches=skin.Patches.filter(p=>p.TargetJs!=='compat/glass-controls.js');
write(out+'/compat/main.js',read(out+'/compat/main.js').replace('import "./glass-controls.js";',''));
write(out+'/compat/glass-controls.js','(()=>{document.getElementById("our-glass-button")?.remove();document.getElementById("our-glass-dialog")?.remove();})();');
fs.copyFileSync(__dirname+'/tray-restart.js',out+'/compat/tray-restart.js');
skin.Patches.push({MatchRegexString:'^Menu$',TargetJs:'compat/tray-restart.js'});
fs.copyFileSync(__dirname+'/restart-bridge.js',out+'/compat/restart-bridge.js');
write(out+'/compat/main.js',read(out+'/compat/main.js')+'\nimport "./restart-bridge.js";\n');
write(out+'/skin.json',JSON.stringify(skin,null,2)+'\n');
write(process.env.AIKA_REVIEW_WORK+'/effects-integration.json',JSON.stringify({at:new Date().toISOString(),version:skin.version,patches:skin.Patches.length,conditions:Object.keys(skin.Conditions).length,liveVerified:false},null,2));
console.log('Integrated Aika modules, dedicated login/menu/toast patches, web effects, fail-open cinematic and QOL ownership.');

write(dst+'/sections/login.css',read(dst+'/sections/login.css')+'\n'+alias('.Login .LoadingStatus > .LoginStatus::after')+'{content:none!important;display:none!important;animation:none!important}\n');

fs.copyFileSync(__dirname+'/theme-credits.js',out+'/compat/theme-credits.js');
write(out+'/compat/main.js',read(out+'/compat/main.js')+'\nimport "./theme-credits.js";\n');
skin.author='Fluenty — Millennium (SteamClientHomebrew); Aika — hatewxb; QOL — madmaxgrey';
write(out+'/skin.json',JSON.stringify(skin,null,2)+'\n');
// Keep language first in the theme configuration and provide a persistent quick switch.
const languageKey=Object.keys(skin.Conditions).find(k=>k.startsWith('Язык нашего интерфейса /'));
if(languageKey)skin.Conditions={[languageKey]:skin.Conditions[languageKey],...Object.fromEntries(Object.entries(skin.Conditions).filter(([k])=>k!==languageKey))};
fs.copyFileSync(__dirname+'/language-quick.js',out+'/compat/language-quick.js');
write(out+'/compat/main.js',read(out+'/compat/main.js')+'\nimport "./language-quick.js";\n');
write(out+'/skin.json',JSON.stringify(skin,null,2)+'\n');
fs.copyFileSync(__dirname+'/friends-menu.js',out+'/compat/friends-menu.js');
fs.copyFileSync(__dirname+'/profile-status.css',out+'/compat/profile-status.css');
skin.Patches.push({MatchRegexString:'^Menu$',TargetJs:'compat/friends-menu.js'});
skin.Patches.push({MatchRegexString:'^Steam$',TargetCss:'compat/profile-status.css'});
write(out+'/compat/main.js',read(out+'/compat/main.js')+'\nimport "./friends-menu.js";\n');
write(out+'/skin.json',JSON.stringify(skin,null,2)+'\n');
fs.copyFileSync(__dirname+'/self-status.js',out+'/compat/self-status.js');
write(out+'/compat/main.js',read(out+'/compat/main.js')+'\nimport "./self-status.js";\n');

// Performance pass: navigation must not wait for decorative curtains.
write(out+'/compat/main.js',read(out+'/compat/main.js').replace('import "./page-curtain.js";',''));
fs.copyFileSync(__dirname+'/boot-reveal-optimized.js',out+'/compat/boot-reveal.js');
write(out+'/compat/performance.css','html:root #our-language-quick{contain:layout style}');
skin.Patches.push({MatchRegexString:'^Steam$',TargetCss:'compat/performance.css'});
write(out+'/skin.json',JSON.stringify(skin,null,2)+'\n');// Throttle menu discovery: game/status updates must not trigger a full scan per class mutation.
for(const file of ['compat/aika/js/menu-motion.js','compat/spotlight.js']){
 let code=read(out+'/'+file);
 if(file.endsWith('spotlight.js')){
  code=code.replace('const off = () => {','let prefAt=0,prefOff=false;\n  const off = () => {\n    const now=performance.now();if(now-prefAt<1000)return prefOff;prefAt=now;');
  code=code.replace('return css.getPropertyValue("--aika-motion").trim() === "0" || css.getPropertyValue("--aika-decor").trim() === "0";','return prefOff=css.getPropertyValue("--aika-motion").trim() === "0" || css.getPropertyValue("--aika-decor").trim() === "0";');
 }
 write(out+'/'+file,code);
}
// Download events can arrive without a sidebar (store/popups/compact mode).
const monitorPath=out+'/src/scripts/downloadMonitor.js';
let monitor=read(monitorPath).replace("const { matchedElements } = await waitForElement('#downloads', 3000);","const button=document.getElementById('downloads');if(!button)return;const matchedElements=[button];");
monitor=monitor.replace(/\s*if\(window\.__ourDownloadMonitorRegistered\)return;window\.__ourDownloadMonitorRegistered=true;/g,'');
monitor=monitor.replace('export function RegisterForUpdates() {','export function RegisterForUpdates() {\n    if(window.__ourDownloadMonitorRegistered)return;window.__ourDownloadMonitorRegistered=true;');
write(monitorPath,monitor);
// Store performance: safe CSS fallback when Steam blocks optional helper scripts.
fs.copyFileSync(__dirname+'/store-performance.css',out+'/compat/store-performance.css');
write(out+'/compat/web-effects.css',read(out+'/compat/web-effects.css')+'\n@import url("store-performance.css");\n');
// Do not reload an already visible web route or queue duplicate rapid clicks.
const sidebarPath=out+'/src/scripts/components/sidebar.js';
let sidebar=read(sidebarPath).replace(/let ourLastRoute=\"\",ourLastRouteAt=0;\s*/g,'');
sidebar=sidebar.replace('function navigate(skipRedirect, targetElement, navigator, url) {','let ourLastRoute="",ourLastRouteAt=0;\n\tfunction navigate(skipRedirect, targetElement, navigator, url) {');
sidebar=sidebar.replace('window.opener.MainWindowBrowserManager.ShowURL(url);',`const manager=window.opener.MainWindowBrowserManager;
                const current=String(manager.DisplayURL||manager.m_browser?.m_URL||'');
                const normal=value=>{try{const u=new URL(value);return u.origin+u.pathname.replace(/\\/$/,'')+u.search+u.hash}catch{return value}};
                const alreadyVisible=normal(current)===normal(url);
                const duplicate=ourLastRoute===url&&performance.now()-ourLastRouteAt<750;
                if(!alreadyVisible&&!duplicate){ourLastRoute=url;ourLastRouteAt=performance.now();manager.ShowURL(url);}`);
write(sidebarPath,sidebar);
// History listeners also run in secondary Steam windows: no sidebar is normal.
const navPath=out+'/src/scripts/superNavObserver.js';
// Keep Fluenty's locally supplied navigation implementation; it is not redistributed here.
const waiterPath=out+'/src/scripts/waitForElement.js';
write(waiterPath,read(waiterPath).replace('            resolve({','            return resolve({'));
// Tray browser action uses the same native popup as the sidebar.
fs.copyFileSync(__dirname+'/browser-menu.js',out+'/compat/browser-menu.js');
write(out+'/compat/main.js',read(out+'/compat/main.js')+'\nimport "./browser-menu.js";\n');
skin.Patches.push({MatchRegexString:'^Menu$',TargetJs:'compat/browser-menu.js'});
fs.copyFileSync(__dirname+'/add-game-fab.css',out+'/compat/add-game-fab.css');
skin.Patches.push({MatchRegexString:'^Steam$',TargetCss:'compat/add-game-fab.css'});
write(dst+'/js/fab.js',read(dst+'/js/fab.js').replace('const BUTTON = ', 'const BUTTON = ').replace('";\n    const OPEN = "aika-fab-open";', ', [data-our-add-game]";\n    const OPEN = "aika-fab-open";'));
write(out+'/skin.json',JSON.stringify(skin,null,2)+'\n');

// Keep native menu rows at the Aika circle height despite Fluenty menu density rules.
write(dst+'/popup.css',read(dst+'/popup.css')+`
html:root body .contextMenu :is(.AddGameMenu,.H2MNnp7B_8r37I5wiifE0).contextMenuContents{gap:8px!important;padding:4px!important;overflow:visible!important}
html:root body .contextMenu :is(.AddGameMenu,.H2MNnp7B_8r37I5wiifE0).contextMenuContents>.contextMenuItem{box-sizing:border-box!important;height:44px!important;min-height:44px!important;flex:0 0 44px!important;line-height:normal!important;padding-top:0!important;padding-bottom:0!important;overflow:visible!important}
`);

// Late-created/reused menu windows must report FAB visibility after initial discovery expires.
const fabPath=dst+'/js/fab.js';
write(fabPath,read(fabPath).replace('!!document.querySelector(BUTTON + "." + OPEN)','Array.from(document.querySelectorAll(BUTTON)).some(b=>b.classList.contains(OPEN))').replace('const SHOW_WAIT = 900','const SHOW_WAIT = 3000'));
const motionPath=dst+'/js/menu-motion.js';
write(motionPath,read(motionPath).replace('    sync(false);\n})();',`    let lastFabVisible=false, fabSyncPending=false;
    new MutationObserver(()=>{
        const visible=document.visibilityState==='visible'&&!!document.querySelector(FAB_MENU);
        if(visible===lastFabVisible)return;
        lastFabVisible=visible;
        if(!visible){if(fabShown&&channel)channel.postMessage({type:'closed'});fabShown=false;return;}
        if(fabSyncPending)return;fabSyncPending=true;
        queueMicrotask(()=>{fabSyncPending=false;sync(true)});
    }).observe(document.body||html,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    sync(false);
})();`));

// Fluent native Add Game menu: remove the Aika FAB-specific layout and controller.
write(out+'/compat/main.js',read(out+'/compat/main.js').replace('import "./aika/js/fab.js";',''));
let plainMenu=read(dst+'/components/menu.css');
const fabStart=plainMenu.indexOf('@property --aika-fab-circle');
const reduceAt=plainMenu.indexOf('"Reduce motion": no entrance animation',fabStart);
const fabEnd=plainMenu.lastIndexOf('/* ---',reduceAt);
if(fabStart>=0&&fabEnd>fabStart)plainMenu=plainMenu.slice(0,fabStart)+plainMenu.slice(fabEnd);
write(dst+'/components/menu.css',plainMenu);
write(dst+'/js/menu-motion.js',read(dst+'/js/menu-motion.js').replace(/const FAB_MENU = [^;]+;/,'const FAB_MENU = ".our-disabled-aika-fab-menu";'));
write(dst+'/popup.css','@import url("foundation.css");\n@import url("components/menu.css");\n'+`
html:root body .contextMenu:has(> :is(.AddGameMenu,.H2MNnp7B_8r37I5wiifE0)){animation:none!important;clip-path:none!important;transform:none!important}
html:root body .contextMenu :is(.AddGameMenu,.H2MNnp7B_8r37I5wiifE0){display:flex!important;flex-direction:column!important;gap:0!important;padding:4px!important;background:#282828!important;border:1px solid #ffffff20!important;border-radius:6px!important;overflow:hidden!important}
html:root body .contextMenu :is(.AddGameMenu,.H2MNnp7B_8r37I5wiifE0)>.contextMenuItem{box-sizing:border-box!important;min-height:34px!important;height:auto!important;padding:8px 12px!important;line-height:18px!important;white-space:nowrap!important;animation:none!important;opacity:1!important;transform:none!important;color:#eee!important;background:transparent!important}
html:root body .contextMenu :is(.AddGameMenu,.H2MNnp7B_8r37I5wiifE0)>.contextMenuItem:hover{background:#ffffff14!important}
html:root body .contextMenu :is(.AddGameMenu,.H2MNnp7B_8r37I5wiifE0)>.contextMenuItem::before,html:root body .contextMenu :is(.AddGameMenu,.H2MNnp7B_8r37I5wiifE0)>.contextMenuItem::after{display:none!important}
`);

// Return to the existing browser view without loading the same URL again.
write(sidebarPath,read(sidebarPath).replace('if(!alreadyVisible&&!duplicate){ourLastRoute=url;ourLastRouteAt=performance.now();manager.ShowURL(url);}',`if(alreadyVisible){
                    const route=manager.m_history?.location?.pathname||'';
                    if(route!=='/browser')window.opener.SteamUIStore.Navigate('/browser');
                }else if(!duplicate){ourLastRoute=url;ourLastRouteAt=performance.now();manager.ShowURL(url);}`));

// Pop observer is unnecessary once scroll entrance effects are disabled.
const storeHomeJs=dst+'/js/store-home.js';
write(storeHomeJs,read(storeHomeJs).replace('if (still) document.documentElement.classList.add("aika-pop-js");','if (true) document.documentElement.classList.add("aika-pop-js");'));

// No cursor-driven gradient repaints on the store homepage. Other Aika pages retain their effects.
write(storeHomeJs,read(storeHomeJs).replace('const calm = still ||','const calm = true ||'));

// Appearance picker: original preset is unchanged; Neutron is an opt-in Steam adaptation.
fs.copyFileSync(__dirname+'/appearance.js',out+'/compat/appearance.js');
write(out+'/compat/appearance.css',alias(read(__dirname+'/appearance.css')));
write(out+'/compat/main.js',read(out+'/compat/main.js')+'\nimport "./appearance.js";\n');
skin.Patches.push({MatchRegexString:'^Steam$',TargetCss:'compat/appearance.css'});
skin.Patches.push({MatchRegexString:'^Menu$',TargetCss:'compat/appearance.css',TargetJs:'compat/appearance.js'});
write(out+'/skin.json',JSON.stringify(skin,null,2)+'\n');

// One persisted appearance condition for all Steam windows and web views.
skin.Conditions['Оформление / Appearance / 外观']={tab:'Внешний вид / Appearance / 外观',description:'Fluenty + Aika + QOL или Neutron: единый HUD, полупрозрачные панели и фон. Переключатель с кисточкой в заголовке окна.',default:'original',values:{original:{},neutron:{}}};
skin.Patches.push({MatchRegexString:'^(?!https?://).*$',TargetCss:'compat/appearance.css',TargetJs:'compat/appearance.js'});
skin.Patches.push({MatchRegexString:'^https://(store\\.steampowered|steamcommunity)\\.com/.*',TargetCss:'compat/appearance.css',TargetJs:'compat/appearance.js'});
write(out+'/compat/web-effects.css',read(out+'/compat/web-effects.css')+'\n@import url("appearance.css");\n');
skin.webkitJS='compat/appearance.js';
write(out+'/skin.json',JSON.stringify(skin,null,2)+'\n');

// CSS-only fallback for web pages that block optional theme scripts under CSP.
write(out+'/compat/appearance-neutron.css',':root{--our-appearance-preset:neutron}\n'+read(out+'/compat/appearance.css').replaceAll('html:root[data-our-appearance=neutron]','html:root:not([data-our-appearance=original])'));
skin.Conditions['Оформление / Appearance / 外观'].values.neutron={TargetCss:{affects:['.*'],src:'compat/appearance-neutron.css'}};
write(out+'/skin.json',JSON.stringify(skin,null,2)+'\n');
